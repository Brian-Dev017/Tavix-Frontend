<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "primevue/usetoast";
import { useRol } from "@/shared/composables/useRol";
import {
  menuApi,
  type CategoriaConProductosDTO,
  type ProductoDTO,
} from "@/modules/catalogo/api/menuApi";
import { pedidosApi, type ItemPedido } from "@/modules/pedidos/api/pedidosApi";
import { mesasApi } from "@/modules/mesas/api/mesasApi";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import InputNumber from "primevue/inputnumber";
import Badge from "primevue/badge";
import { cleanText, maxLength, numberRange } from "@/shared/validation/inputValidation";

interface ItemPendiente {
  localId: number;
  productoId: number;
  productoNombre: string;
  cantidad: number;
  precio: number;
  subtotal: number;
  observaciones: string;
}

const route = useRoute();
const router = useRouter();
const toast = useToast();
const { rolMeta, isAdmin, nombreCompleto } = useRol();

const sesionId = Number(route.params.sesionId);
const mesaNum = (route.query.mesa as string) ?? `#${sesionId}`;

const pedidoId = ref<number | null>(null);
const menu = ref<CategoriaConProductosDTO[]>([]);
const items = ref<ItemPedido[]>([]);
const itemsPendientes = ref<ItemPendiente[]>([]);
const categoriaActiva = ref<number | null>(null);
const productoPendiente = ref<ProductoDTO | null>(null);
const cantidad = ref(1);
const observacion = ref("");
const loading = ref(true);
const agregando = ref(false);
let pendingSequence = 0;

const productosActivos = computed(
  () => menu.value.find((c) => c.id === categoriaActiva.value)?.productos ?? [],
);

const totalPedido = computed(() =>
  items.value.reduce((sum, i) => sum + i.subtotal, 0),
);

const totalPendiente = computed(() =>
  itemsPendientes.value.reduce((sum, i) => sum + i.subtotal, 0),
);

const totalGeneral = computed(() => totalPedido.value + totalPendiente.value);

const totalItemsVista = computed(() => items.value.length + itemsPendientes.value.length);

onMounted(async () => {
  loading.value = true;
  try {
    const [menuRes, pedidoRes] = await Promise.all([
      menuApi.getMenu(),
      pedidosApi.crear(sesionId),
    ]);
    menu.value = menuRes.data.data;
    pedidoId.value = pedidoRes.data.data.id;
    if (menu.value.length) categoriaActiva.value = menu.value[0].id;
    const itemsRes = await pedidosApi.getItems(pedidoId.value);
    items.value = itemsRes.data.data;
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } };
    toast.add({
      severity: "error",
      summary: "Error",
      detail: err.response?.data?.message ?? "Error cargando pedido",
      life: 3000,
    });
    router.push("/mesas");
  } finally {
    loading.value = false;
  }
});

function seleccionarProducto(producto: ProductoDTO) {
  if (!producto.disponible) {
    toast.add({
      severity: "warn",
      summary: "Producto no disponible",
      detail: "No se puede agregar al pedido",
      life: 2500,
    });
    return;
  }
  productoPendiente.value = producto;
  cantidad.value = 1;
}

async function agregarProducto() {
  if (!productoPendiente.value) return;
  const validationError =
    numberRange(cantidad.value, "Cantidad", 1, 99) ||
    maxLength(observacion.value, "Observacion", 180);
  if (validationError) {
    toast.add({
      severity: "warn",
      summary: "Revisa el pedido",
      detail: validationError,
      life: 3000,
    });
    return;
  }
  const producto = productoPendiente.value;
  itemsPendientes.value.push({
    localId: ++pendingSequence,
    productoId: producto.id,
    productoNombre: producto.nombre,
    cantidad: Number(cantidad.value),
    precio: Number(producto.precio),
    subtotal: Number(producto.precio) * Number(cantidad.value),
    observaciones: cleanText(observacion.value),
  });
  observacion.value = "";
  cantidad.value = 1;
  productoPendiente.value = null;
  toast.add({
    severity: "success",
    summary: "Item agregado",
    detail: `${producto.nombre} quedo pendiente de confirmacion`,
    life: 2000,
  });
}

function quitarPendiente(localId: number) {
  itemsPendientes.value = itemsPendientes.value.filter((item) => item.localId !== localId);
}

async function confirmarPedido() {
  if (!pedidoId.value || itemsPendientes.value.length === 0) return;
  const ok = window.confirm(
    `Confirmar pedido\n\nItems: ${itemsPendientes.value.length}\nTotal: S/ ${totalPendiente.value.toFixed(2)}`,
  );
  if (!ok) return;

  agregando.value = true;
  try {
    const enviados = [];
    for (const item of itemsPendientes.value) {
      const res = await pedidosApi.agregarItem(
        pedidoId.value,
        item.productoId,
        item.cantidad,
        item.observaciones,
      );
      enviados.push(res.data.data);
    }
    items.value.push(...enviados);
    itemsPendientes.value = [];
    toast.add({
      severity: "success",
      summary: "Pedido confirmado",
      detail: `${enviados.length} item${enviados.length !== 1 ? "s" : ""} enviado${enviados.length !== 1 ? "s" : ""} a cocina`,
      life: 2500,
    });
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } };
    toast.add({
      severity: "error",
      summary: "Error",
      detail: err.response?.data?.message ?? "No se pudo confirmar el pedido",
      life: 3000,
    });
  } finally {
    agregando.value = false;
  }
}

async function volverAMesas() {
  if (itemsPendientes.value.length > 0) {
    const ok = window.confirm("Hay items pendientes sin confirmar. Si sales, se descartaran. Deseas continuar?");
    if (!ok) return;
  }
  if (items.value.length === 0) {
    try {
      await mesasApi.cerrarSesion(sesionId);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.add({
        severity: "warn",
        summary: "Mesa no liberada",
        detail: err.response?.data?.message ?? "No se pudo liberar la mesa",
        life: 3000,
      });
    }
  }
  router.push("/mesas");
}
</script>

<template>
  <div class="pedido-page" v-if="!loading">
    <header class="pedido-header">
      <div class="pedido-header-left">
        <button
          class="icon-back"
          @click="volverAMesas"
          title="Volver a mesas"
        >
          <i class="pi pi-arrow-left"></i>
        </button>
        <div class="header-info">
          <span class="header-title">Mesa {{ mesaNum }}</span>
          <span class="header-sub">Sesion #{{ sesionId }}</span>
        </div>
      </div>
      <div class="pedido-header-right">
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
          class="icon-back"
          @click="router.push('/admin')"
          title="Panel admin"
        >
          <i class="pi pi-shield"></i>
        </button>
      </div>
    </header>

    <div class="pedido-layout">
      <aside class="menu-panel">
        <div class="panel-header">
          <i class="pi pi-book"></i>
          <span>Menu</span>
        </div>

        <div class="categorias">
          <button
            v-for="cat in menu"
            :key="cat.id"
            class="categoria-btn"
            :class="{ active: categoriaActiva === cat.id }"
            @click="categoriaActiva = cat.id"
          >
            {{ cat.nombre }}
          </button>
        </div>

        <div class="obs-field">
          <label>Producto</label>
          <InputText
            :model-value="productoPendiente?.nombre ?? 'Selecciona un producto'"
            readonly
            fluid
            size="small"
          />
        </div>

        <div class="obs-field">
          <label>Cantidad</label>
          <InputNumber
            v-model="cantidad"
            :min="1"
            :max="99"
            showButtons
            fluid
            size="small"
          />
        </div>

        <div class="obs-field">
          <label>Observacion</label>
          <InputText
            v-model="observacion"
            placeholder="Sin cebolla, extra salsa..."
            fluid
            size="small"
          />
        </div>

        <div class="productos-grid">
          <div
            v-for="prod in productosActivos"
            :key="prod.id"
            class="producto-item"
            :class="{ 'producto-loading': agregando, selected: productoPendiente?.id === prod.id, unavailable: !prod.disponible }"
            @click="seleccionarProducto(prod)"
          >
            <span class="prod-nombre">{{ prod.nombre }}</span>
            <span class="prod-precio">
              {{ prod.disponible ? `S/ ${prod.precio.toFixed(2)}` : "No disponible" }}
            </span>
          </div>
        </div>

        <Button
          label="Agregar al pedido"
          icon="pi pi-plus"
          size="small"
          fluid
          :disabled="!productoPendiente"
          :loading="agregando"
          @click="agregarProducto"
        />
      </aside>

      <main class="pedido-panel">
        <div class="panel-header">
          <i class="pi pi-receipt"></i>
          <span>Pedido</span>
          <span v-if="totalItemsVista > 0" class="item-count">
            {{ totalItemsVista }} item{{ totalItemsVista !== 1 ? "s" : "" }}
          </span>
        </div>

        <div v-if="totalItemsVista === 0" class="empty-pedido">
          <i class="pi pi-cart-plus"></i>
          <p>Sin items aun</p>
          <span>Selecciona producto, cantidad y observacion antes de agregar</span>
        </div>

        <div v-else class="items-list">
          <div v-if="itemsPendientes.length > 0" class="list-block">
            <div class="list-block-title">Pendientes por confirmar</div>
            <div v-for="item in itemsPendientes" :key="item.localId" class="item-row pending">
              <div class="item-info item-info-column">
                <span class="item-nombre">
                  {{ item.cantidad }}x {{ item.productoNombre }}
                </span>
                <span v-if="item.observaciones" class="item-observacion">
                  {{ item.observaciones }}
                </span>
                <Badge value="PENDIENTE" severity="warn" class="item-estado" />
              </div>
              <span class="item-precio">S/ {{ item.subtotal.toFixed(2) }}</span>
              <button class="item-remove" @click="quitarPendiente(item.localId)" title="Quitar item">
                <i class="pi pi-times"></i>
              </button>
            </div>
          </div>

          <div v-if="items.length > 0" class="list-block">
            <div class="list-block-title">Enviados</div>
          <div v-for="item in items" :key="item.detalleId" class="item-row">
            <div class="item-info">
              <span class="item-nombre">
                {{ item.cantidad }}x {{ item.productoNombre }}
              </span>
              <span v-if="item.observaciones" class="item-observacion">
                {{ item.observaciones }}
              </span>
              <Badge
                :value="item.estado"
                severity="secondary"
                class="item-estado"
              />
            </div>
            <span class="item-precio">S/ {{ item.subtotal.toFixed(2) }}</span>
          </div>
        </div>
        </div>

        <div class="pedido-footer" v-if="totalItemsVista > 0">
          <div v-if="itemsPendientes.length > 0" class="footer-row">
            <span class="total-label">Pendiente por confirmar</span>
            <span class="pending-amount">S/ {{ totalPendiente.toFixed(2) }}</span>
          </div>
          <div class="footer-row">
            <span class="total-label">Total general</span>
            <span class="total-amount">S/ {{ totalGeneral.toFixed(2) }}</span>
          </div>
          <Button
            v-if="itemsPendientes.length > 0"
            label="Confirmar pedido"
            icon="pi pi-check"
            size="small"
            :loading="agregando"
            @click="confirmarPedido"
          />
          <Button
            label="Volver a mesas"
            icon="pi pi-arrow-left"
            severity="secondary"
            outlined
            size="small"
            @click="volverAMesas"
          />
        </div>
      </main>
    </div>
  </div>

  <div v-else class="pedido-loading">
    <div class="spinner"></div>
    <p>Cargando pedido...</p>
  </div>
</template>

<style scoped lang="scss" src="./PedidoView.scss"></style>
