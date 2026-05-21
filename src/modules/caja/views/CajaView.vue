<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "primevue/usetoast";
import { performLogout } from "@/shared/auth/logout";
import { useRol } from "@/shared/composables/useRol";
import { cajaApi, type PedidoResumen } from "@/modules/caja/api/cajaApi";
import { reportesApi, type Arqueo } from "@/modules/admin/api/reportesApi";
import { authApi } from "@/modules/auth/api/authApi";
import { useAuthStore, normalizeAuthRole } from "@/modules/auth/store/authStore";
import { decodeJwtPayload } from "@/shared/auth/jwt";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
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
  password,
  onlyDigits,
  required,
  ruc,
  username,
} from "@/shared/validation/inputValidation";

const router = useRouter();
const toast = useToast();
const auth = useAuthStore();
const { rolMeta, isAdmin, nombreCompleto } = useRol();

const pedidos = ref<PedidoResumen[]>([]);
const loading = ref(true);
const procesando = ref(false);
const cajaDialog = ref(false);
const validandoCaja = ref(false);
const arqueoActivo = ref<Arqueo | null>(null);

const pedidoSeleccionado = ref<PedidoResumen | null>(null);
const tipoComprobante = ref("T");
const metodoPago = ref("EFECTIVO");
const rucDni = ref("");
const razonSocial = ref("");
const direccion = ref("");
const descuento = ref(0);
const motivoDescuento = ref("");
const efectivoRecibido = ref(0);
const aperturaForm = ref({
  usuario: "",
  contrasena: "",
  montoApertura: 0,
  notas: "",
});
let refresco: ReturnType<typeof setInterval> | null = null;
let refrescoCaja: ReturnType<typeof setInterval> | null = null;

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

const vuelto = computed(() =>
  metodoPago.value === "EFECTIVO"
    ? Math.max(0, Number(efectivoRecibido.value || 0) - totalFinal.value)
    : 0,
);

const cajaActiva = computed(() => arqueoActivo.value?.estado === "ABIERTO");

const cajaActivaDelUsuario = computed(
  () => cajaActiva.value && arqueoActivo.value?.cajeroId === auth.userId,
);

const cajaBloqueadaPorOtroUsuario = computed(
  () => cajaActiva.value && arqueoActivo.value?.cajeroId !== auth.userId,
);

const nombreCajaActiva = computed(() => arqueoActivo.value?.nombreCajero ?? "otro cajero");

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

async function cargarArqueoActivo(silent = false) {
  try {
    const res = await reportesApi.getActivo();
    arqueoActivo.value = res.data.data;
  } catch {
    arqueoActivo.value = null;
    if (!silent) {
      toast.add({
        severity: "warn",
        summary: "Caja cerrada",
        detail: "No hay una caja abierta en este momento",
        life: 2500,
      });
    }
  }
}

async function recargarTodo() {
  await Promise.allSettled([cargarPedidos(), cargarArqueoActivo(true)]);
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
  efectivoRecibido.value = Number(p.totalConIgv || 0);
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
    !cajaActivaDelUsuario.value &&
      "Debes aperturar tu caja antes de cobrar",
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
    metodoPago.value === "EFECTIVO" && numberRange(efectivoRecibido.value, "Efectivo recibido", totalFinal.value, 999999),
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
      efectivoRecibido: metodoPago.value === "EFECTIVO" ? Number(efectivoRecibido.value || 0) : undefined,
    };
    const res = await cajaApi.emitirComprobante(req);
    const comp = res.data.data;
    toast.add({
      severity: "success",
      summary: "Cobrado",
      detail: `${comp.tipoComprobanteNombre} ${comp.serie}-${String(comp.numero).padStart(8, "0")} - S/ ${Number(comp.total).toFixed(2)}`,
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

function formatFecha(iso: string | null | undefined) {
  if (!iso) return "--";
  return new Date(iso).toLocaleString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function abrirDialogoCaja() {
  aperturaForm.value = {
    usuario: "",
    contrasena: "",
    montoApertura: 0,
    notas: "",
  };
  cajaDialog.value = true;
}

async function aperturarCaja() {
  if (auth.userId === null) {
    toast.add({
      severity: "error",
      summary: "Sesion invalida",
      detail: "No se pudo identificar al usuario autenticado",
      life: 3000,
    });
    return;
  }
  const validationError = firstError([
    username(aperturaForm.value.usuario),
    password(aperturaForm.value.contrasena),
    numberRange(aperturaForm.value.montoApertura, "Monto de apertura", 0, 999999),
    maxLength(aperturaForm.value.notas, "Notas", 180),
  ]);
  if (validationError) {
    toast.add({
      severity: "warn",
      summary: "Revisa la apertura",
      detail: validationError,
      life: 3000,
    });
    return;
  }

  validandoCaja.value = true;
  try {
    const loginRes = await authApi.login({
      usuario: cleanText(aperturaForm.value.usuario),
      contrasena: aperturaForm.value.contrasena,
    });
    const loginData = loginRes.data.data;
    const rolValidado = normalizeAuthRole(loginData.rol);
    const userIdValidado = Number(decodeJwtPayload(loginData.accessToken)?.sub ?? NaN);

    if (!rolValidado || rolValidado !== auth.rol || userIdValidado !== auth.userId) {
      throw new Error("Las credenciales no pertenecen al usuario actual");
    }

    await reportesApi.abrirArqueo(
      auth.userId ?? 0,
      Number(aperturaForm.value.montoApertura),
      cleanText(aperturaForm.value.notas) || undefined,
    );
    cajaDialog.value = false;
    toast.add({
      severity: "success",
      summary: "Caja aperturada",
      detail: "La apertura quedo registrada y visible para administracion",
      life: 3000,
    });
    await cargarArqueoActivo(true);
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } }; message?: string };
    toast.add({
      severity: "error",
      summary: "No se pudo aperturar la caja",
      detail: err.response?.data?.message ?? err.message ?? "Credenciales invalidas o apertura rechazada",
      life: 3500,
    });
  } finally {
    validandoCaja.value = false;
  }
}

onMounted(() => {
  cargarPedidos();
  cargarArqueoActivo(true);
  refresco = setInterval(() => cargarPedidos(true), 10000);
  refrescoCaja = setInterval(() => cargarArqueoActivo(true), 10000);
});

onUnmounted(() => {
  if (refresco) clearInterval(refresco);
  if (refrescoCaja) clearInterval(refrescoCaja);
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
          @click="recargarTodo"
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

        <div class="caja-status-card">
          <div class="caja-status-head">
            <div>
              <div class="col-title">Estado de caja</div>
              <div class="caja-status-sub">
                <template v-if="cajaActivaDelUsuario">
                  Aperturada por ti el {{ formatFecha(arqueoActivo?.aperturaEn) }}
                </template>
                <template v-else-if="cajaBloqueadaPorOtroUsuario">
                  Aperturada por {{ nombreCajaActiva }}
                </template>
                <template v-else>
                  Aun no aperturas tu caja
                </template>
              </div>
            </div>
            <span
              class="caja-status-badge"
              :class="{
                open: cajaActivaDelUsuario,
                busy: cajaBloqueadaPorOtroUsuario,
                closed: !cajaActiva,
              }"
            >
              {{ cajaActivaDelUsuario ? "ABIERTA" : cajaBloqueadaPorOtroUsuario ? "OCUPADA" : "CERRADA" }}
            </span>
          </div>

          <div class="caja-status-body">
            <span v-if="cajaActiva">
              Monto de apertura: {{ fmt(arqueoActivo?.montoApertura ?? 0) }}
            </span>
            <span v-else>
              Debes validar tus credenciales antes de empezar a cobrar.
            </span>
          </div>

          <Button
            v-if="!cajaActiva"
            label="Aperturar caja"
            icon="pi pi-lock-open"
            size="small"
            @click="abrirDialogoCaja"
          />
          <Button
            v-else-if="isAdmin"
            label="Ver en admin"
            icon="pi pi-shield"
            severity="secondary"
            outlined
            size="small"
            @click="router.push('/admin/caja')"
          />
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
          <span v-if="!cajaActivaDelUsuario" class="cobro-note">
            La caja debe estar aperturada con tus credenciales.
          </span>
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

          <div v-if="metodoPago === 'EFECTIVO'" class="form-field">
            <label>Efectivo recibido</label>
            <InputNumber
              v-model="efectivoRecibido"
              :min="0"
              :minFractionDigits="2"
              :maxFractionDigits="2"
              fluid
            />
            <small class="cash-change">Vuelto: {{ fmt(vuelto) }}</small>
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
              :disabled="pedidoSeleccionado.estadoPedido !== 'LISTO' || !cajaActivaDelUsuario"
              :loading="procesando"
              @click="cobrar"
            />
          </div>
        </div>
      </div>
    </div>

    <Dialog
      v-model:visible="cajaDialog"
      header="Aperturar caja"
      modal
      :style="{ width: '30rem', maxWidth: '95vw' }"
    >
      <div class="dialog-form">
        <p class="dialog-copy">
          Ingresa tus credenciales para validar la apertura. Este registro quedara visible en el panel de administracion.
        </p>

        <div class="form-field">
          <label>Usuario</label>
          <InputText
            v-model="aperturaForm.usuario"
            placeholder="Tu usuario"
            fluid
          />
        </div>

        <div class="form-field">
          <label>Contrasena</label>
          <InputText
            v-model="aperturaForm.contrasena"
            type="password"
            placeholder="Tu contrasena"
            fluid
          />
        </div>

        <div class="form-field">
          <label>Monto de apertura</label>
          <InputNumber
            v-model="aperturaForm.montoApertura"
            :min="0"
            :minFractionDigits="2"
            :maxFractionDigits="2"
            fluid
          />
        </div>

        <div class="form-field">
          <label>Notas</label>
          <InputText
            v-model="aperturaForm.notas"
            placeholder="Observaciones opcionales"
            fluid
          />
        </div>
      </div>

      <template #footer>
        <Button
          label="Cancelar"
          severity="secondary"
          text
          :disabled="validandoCaja"
          @click="cajaDialog = false"
        />
        <Button
          label="Confirmar apertura"
          icon="pi pi-check"
          :loading="validandoCaja"
          @click="aperturarCaja"
        />
      </template>
    </Dialog>
  </div>
</template>

<style scoped lang="scss" src="./CajaView.scss"></style>
