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

const route = useRoute();
const router = useRouter();
const toast = useToast();
const { rolMeta, isAdmin, nombreCompleto } = useRol();

const sesionId = Number(route.params.sesionId);
const mesaNum = (route.query.mesa as string) ?? `#${sesionId}`;

const pedidoId = ref<number | null>(null);
const menu = ref<CategoriaConProductosDTO[]>([]);
const items = ref<ItemPedido[]>([]);
const categoriaActiva = ref<number | null>(null);
const productoPendiente = ref<ProductoDTO | null>(null);
const cantidad = ref(1);
const observacion = ref("");
const loading = ref(true);
const agregando = ref(false);

const productosActivos = computed(
  () => menu.value.find((c) => c.id === categoriaActiva.value)?.productos ?? [],
);

const totalPedido = computed(() =>
  items.value.reduce((sum, i) => sum + i.subtotal, 0),
);

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
  if (!pedidoId.value || !productoPendiente.value) return;
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
  const subtotal = Number(productoPendiente.value.precio) * Number(cantidad.value);
  const ok = window.confirm(
    `Confirmar pedido\n\n${cantidad.value} x ${productoPendiente.value.nombre}\nTotal parcial: S/ ${subtotal.toFixed(2)}`,
  );
  if (!ok) return;

  agregando.value = true;
  try {
    const producto = productoPendiente.value;
    const res = await pedidosApi.agregarItem(
      pedidoId.value,
      producto.id,
      Number(cantidad.value),
      cleanText(observacion.value),
    );
    items.value.push(res.data.data);
    observacion.value = "";
    cantidad.value = 1;
    productoPendiente.value = null;
    toast.add({
      severity: "success",
      summary: "Agregado",
      detail: `${producto.nombre} enviado a cocina`,
      life: 2000,
    });
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } };
    toast.add({
      severity: "error",
      summary: "Error",
      detail: err.response?.data?.message ?? "No se pudo agregar",
      life: 3000,
    });
  } finally {
    agregando.value = false;
  }
}

async function volverAMesas() {
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
          <span v-if="items.length > 0" class="item-count">
            {{ items.length }} item{{ items.length !== 1 ? "s" : "" }}
          </span>
        </div>

        <div v-if="items.length === 0" class="empty-pedido">
          <i class="pi pi-cart-plus"></i>
          <p>Sin items aun</p>
          <span>Selecciona producto, cantidad y observacion antes de agregar</span>
        </div>

        <div v-else class="items-list">
          <div v-for="item in items" :key="item.detalleId" class="item-row">
            <div class="item-info">
              <span class="item-nombre">
                {{ item.cantidad }}x {{ item.productoNombre }}
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

        <div class="pedido-footer" v-if="items.length > 0">
          <div class="footer-row">
            <span class="total-label">Total parcial</span>
            <span class="total-amount">S/ {{ totalPedido.toFixed(2) }}</span>
          </div>
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
