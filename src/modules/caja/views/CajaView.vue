<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "primevue/usetoast";
import { performLogout } from "@/shared/auth/logout";
import { useRol } from "@/shared/composables/useRol";
import { cajaApi, type PedidoResumen } from "@/modules/caja/api/cajaApi";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import InputNumber from "primevue/inputnumber";
import Select from "primevue/select";
import {
  cleanText,
  dni,
  firstError,
  maxLength,
  numberRange,
  oneOf,
  onlyDigits,
  required,
  ruc,
} from "@/shared/validation/inputValidation";

const router = useRouter();
const toast = useToast();
const { rolMeta, isAdmin, nombreCompleto } = useRol();

const pedidos = ref<PedidoResumen[]>([]);
const loading = ref(true);
const procesando = ref(false);

const pedidoSeleccionado = ref<PedidoResumen | null>(null);
const tipoComprobante = ref("T");
const metodoPago = ref("EFECTIVO");
const rucDni = ref("");
const razonSocial = ref("");
const direccion = ref("");
const descuento = ref(0);
const motivoDescuento = ref("");
let refresco: ReturnType<typeof setInterval> | null = null;

const tiposComprobante = [
  { label: "Ticket", value: "T" },
  { label: "Boleta", value: "B" },
  { label: "Factura", value: "F" },
];

const metodosPago = [
  { label: "Efectivo", value: "EFECTIVO" },
  { label: "Tarjeta", value: "TARJETA" },
  { label: "Yape", value: "YAPE" },
  { label: "Plin", value: "PLIN" },
  { label: "Izipay", value: "IZIPAY" },
  { label: "Transferencia", value: "TRANSFERENCIA" },
];

const requiereDatos = computed(
  () => tipoComprobante.value === "B" || tipoComprobante.value === "F",
);

const totalFinal = computed(() => {
  if (!pedidoSeleccionado.value) return 0;
  return Math.max(0, Number(pedidoSeleccionado.value.totalConIgv) - Number(descuento.value || 0));
});

async function cargarPedidos(silent = false) {
  if (!silent) loading.value = true;
  try {
    const res = await cajaApi.getPedidosActivos();
    pedidos.value = res.data.data;
    if (pedidoSeleccionado.value) {
      const updated = pedidos.value.find((p) => p.pedidoId === pedidoSeleccionado.value?.pedidoId);
      pedidoSeleccionado.value = updated ?? null;
    }
  } catch {
    if (!silent) {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudieron cargar los pedidos",
        life: 3000,
      });
    }
  } finally {
    loading.value = false;
  }
}

function seleccionarPedido(p: PedidoResumen) {
  pedidoSeleccionado.value = p;
  tipoComprobante.value = "T";
  metodoPago.value = "EFECTIVO";
  rucDni.value = "";
  razonSocial.value = "";
  direccion.value = "";
  descuento.value = 0;
  motivoDescuento.value = "";
}

function cancelarSeleccion() {
  pedidoSeleccionado.value = null;
}

async function handleLogout() {
  await performLogout();
  router.push("/login");
}

async function cobrar() {
  if (!pedidoSeleccionado.value) return;
  const validationError = firstError([
    pedidoSeleccionado.value.estadoPedido !== "LISTO" &&
      "Solo se puede cobrar un pedido LISTO",
    oneOf(
      tipoComprobante.value,
      tiposComprobante.map((t) => t.value),
      "Tipo de comprobante",
    ),
    oneOf(
      metodoPago.value,
      metodosPago.map((m) => m.value),
      "Metodo de pago",
    ),
    tipoComprobante.value === "F" && ruc(rucDni.value),
    tipoComprobante.value === "F" && required(razonSocial.value, "Razon social"),
    tipoComprobante.value === "F" && required(direccion.value, "Direccion"),
    tipoComprobante.value === "B" && onlyDigits(rucDni.value).length > 0 && dni(rucDni.value),
    requiereDatos.value && maxLength(razonSocial.value, "Razon social / Nombre", 120),
    maxLength(direccion.value, "Direccion", 160),
    numberRange(descuento.value, "Descuento", 0, pedidoSeleccionado.value.totalConIgv),
    Number(descuento.value || 0) > 0 && required(motivoDescuento.value, "Motivo de descuento"),
    maxLength(motivoDescuento.value, "Motivo de descuento", 160),
  ]);
  if (validationError) {
    toast.add({
      severity: "warn",
      summary: "Revisa el comprobante",
      detail: validationError,
      life: 3000,
    });
    return;
  }

  procesando.value = true;
  try {
    const req = {
      pedidoId: pedidoSeleccionado.value.pedidoId,
      tipoComprobanteId: tipoComprobante.value,
      metodoPago: metodoPago.value,
      datosComprobante: requiereDatos.value
        ? {
            rucDni: onlyDigits(rucDni.value),
            razonSocial: cleanText(razonSocial.value),
            direccion: cleanText(direccion.value),
          }
        : undefined,
      descuento: isAdmin.value ? Number(descuento.value || 0) : 0,
      motivoDescuento: isAdmin.value ? cleanText(motivoDescuento.value) : "",
    };
    const res = await cajaApi.emitirComprobante(req);
    const comp = res.data.data;
    toast.add({
      severity: "success",
      summary: "Cobrado",
      detail: `${comp.serie}-${String(comp.numero).padStart(8, "0")} - S/ ${Number(comp.total).toFixed(2)}`,
      life: 5000,
    });
    pedidoSeleccionado.value = null;
    await cargarPedidos();
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } };
    toast.add({
      severity: "error",
      summary: "Error al cobrar",
      detail: err.response?.data?.message ?? "No se pudo emitir el comprobante",
      life: 4000,
    });
  } finally {
    procesando.value = false;
  }
}

function fmt(v: number) {
  return `S/ ${Number(v).toFixed(2)}`;
}

onMounted(() => {
  cargarPedidos();
  refresco = setInterval(() => cargarPedidos(true), 10000);
});

onUnmounted(() => {
  if (refresco) clearInterval(refresco);
});
</script>

<template>
  <div class="caja-page">
    <header class="page-header">
      <div>
        <h1 class="page-title">
          <i
            class="pi pi-wallet"
            style="
              color: var(--c-green, #16a34a);
              margin-right: 0.4rem;
              font-size: 1rem;
            "
          ></i>
          Caja
        </h1>
        <p class="page-subtitle">Cobros - Comprobantes fiscales</p>
      </div>

      <div class="page-actions">
        <span
          class="rol-chip"
          :style="{
            color: rolMeta?.color,
            background: rolMeta?.bg,
            borderColor: rolMeta?.border,
          }"
        >
          <i :class="`pi ${rolMeta?.icon}`"></i>
          {{ nombreCompleto }}
        </span>
        <button
          v-if="isAdmin"
          class="hdr-btn"
          @click="router.push('/admin')"
          title="Panel admin"
        >
          <i class="pi pi-shield"></i>
        </button>
        <button
          class="hdr-btn"
          :class="{ spinning: loading }"
          @click="cargarPedidos()"
          title="Actualizar"
        >
          <i class="pi pi-sync"></i>
        </button>
        <button
          class="hdr-btn danger"
          @click="handleLogout"
          title="Cerrar sesion"
        >
          <i class="pi pi-sign-out"></i>
        </button>
      </div>
    </header>

    <div v-if="loading" class="page-loading">
      <div class="page-spinner"></div>
      <span>Cargando pedidos...</span>
    </div>

    <div v-else class="caja-layout">
      <div class="pedidos-col">
        <div class="col-header-bar">
          <span class="col-title">Pedidos activos</span>
          <span class="col-badge">{{ pedidos.length }}</span>
        </div>

        <div class="pedidos-scroll">
          <div v-if="pedidos.length === 0" class="empty-state">
            <i class="pi pi-check-circle"></i>
            <p>No hay pedidos pendientes de cobro</p>
          </div>

          <div
            v-for="p in pedidos"
            :key="p.pedidoId"
            class="pedido-card"
            :class="{
              'pedido-card--selected':
                pedidoSeleccionado?.pedidoId === p.pedidoId,
            }"
            @click="seleccionarPedido(p)"
          >
            <div class="pedido-card-top">
              <span class="mesa-tag">Mesa {{ p.mesa }}</span>
              <span
                class="estado-tag"
                :class="'estado-' + p.estadoPedido.toLowerCase().replace(' ', '_')"
              >
                {{ p.estadoPedido }}
              </span>
            </div>
            <div class="pedido-meta">
              {{ p.mesero }} - {{ p.totalItems }} items
            </div>
            <div class="pedido-total">{{ fmt(p.totalConIgv) }}</div>
          </div>
        </div>
      </div>

      <div class="cobro-col">
        <div v-if="!pedidoSeleccionado" class="cobro-empty">
          <i class="pi pi-list-check"></i>
          <p>Selecciona un pedido para cobrar</p>
        </div>

        <div v-else class="cobro-scroll">
          <div>
            <div class="cobro-heading">Cobrar pedido</div>
            <div class="cobro-sub">
              Mesa {{ pedidoSeleccionado.mesa }} - {{ pedidoSeleccionado.mesero }}
            </div>
          </div>

          <div class="resumen-box">
            <div class="items-list">
              <div
                v-for="item in pedidoSeleccionado.items"
                :key="item.detalleId"
                class="item-row"
              >
                <div>
                  <span class="item-name">{{ item.cantidad }}x {{ item.productoNombre }}</span>
                  <span v-if="item.observaciones" class="item-note">{{ item.observaciones }}</span>
                </div>
                <span class="item-price">{{ fmt(item.subtotal) }}</span>
              </div>
            </div>

            <div class="resumen-row">
              <span>Subtotal</span>
              <span class="val">{{ fmt(pedidoSeleccionado.subtotal) }}</span>
            </div>
            <div class="resumen-row">
              <span>IGV (18%)</span>
              <span class="val">{{ fmt(pedidoSeleccionado.igv) }}</span>
            </div>
            <div class="resumen-row">
              <span>Descuento</span>
              <span class="val">{{ fmt(descuento || 0) }}</span>
            </div>
            <div class="resumen-total">
              <span>Total</span>
              <span class="val">{{ fmt(totalFinal) }}</span>
            </div>
          </div>

          <div class="form-field">
            <label>Tipo de comprobante</label>
            <Select
              v-model="tipoComprobante"
              :options="tiposComprobante"
              optionLabel="label"
              optionValue="value"
              fluid
            />
          </div>

          <div class="form-field">
            <label>Metodo de pago</label>
            <Select
              v-model="metodoPago"
              :options="metodosPago"
              optionLabel="label"
              optionValue="value"
              fluid
            />
          </div>

          <div v-if="isAdmin" class="form-field">
            <label>Descuento</label>
            <InputNumber
              v-model="descuento"
              :min="0"
              :max="pedidoSeleccionado.totalConIgv"
              :minFractionDigits="2"
              :maxFractionDigits="2"
              fluid
            />
          </div>

          <div v-if="isAdmin && Number(descuento || 0) > 0" class="form-field">
            <label>Motivo de descuento</label>
            <InputText v-model="motivoDescuento" placeholder="Autorizacion admin..." fluid />
          </div>

          <div v-if="requiereDatos" class="datos-extra">
            <div class="form-field">
              <label>{{ tipoComprobante === "F" ? "RUC" : "DNI opcional" }}</label>
              <InputText
                v-model="rucDni"
                :placeholder="tipoComprobante === 'F' ? '20xxxxxxxxx' : '########'"
                fluid
              />
            </div>
            <div class="form-field">
              <label>Razon social / Nombre</label>
              <InputText v-model="razonSocial" placeholder="Nombre o empresa" fluid />
            </div>
            <div class="form-field">
              <label>Direccion</label>
              <InputText v-model="direccion" placeholder="Av. ..." fluid />
            </div>
          </div>

          <div class="cobro-actions">
            <Button
              label="Cancelar"
              severity="secondary"
              outlined
              @click="cancelarSeleccion"
            />
            <Button
              :label="`Cobrar ${fmt(totalFinal)}`"
              icon="pi pi-receipt"
              severity="success"
              :disabled="pedidoSeleccionado.estadoPedido !== 'LISTO'"
              :loading="procesando"
              @click="cobrar"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss" src="./CajaView.scss"></style>
