<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useToast } from "primevue/usetoast";
import Toast from "primevue/toast";
import Button from "primevue/button";
import Select from "primevue/select";
import Dialog from "primevue/dialog";
import {
  reportesApi,
  type ComprobanteHistorial,
  type HistorialDetalle,
} from "@/modules/admin/api/reportesApi";
import { loadComprobantePdfData, openComprobantePdf, saveComprobantePdfData } from "@/shared/utils/comprobantePdf";
import { oneOf } from "@/shared/validation/inputValidation";

const toast = useToast();

const items = ref<ComprobanteHistorial[]>([]);
const loading = ref(false);
const page = ref(0);
const totalPages = ref(0);
const totalElements = ref(0);
const PAGE_SIZE = 25;

const estadoOpts = [
  { label: "Todos", value: "" },
  { label: "Completado", value: "COMPLETADO" },
  { label: "Anulado", value: "ANULADO" },
  { label: "Pendiente", value: "PENDIENTE" },
];
const estadoFiltro = ref("");
const detalleDialog = ref(false);
const detalle = ref<HistorialDetalle | null>(null);

async function cargar(p = 0) {
  const validationError = oneOf(
    estadoFiltro.value,
    estadoOpts.map((e) => e.value),
    "Estado",
  );
  if (validationError) {
    toast.add({
      severity: "warn",
      summary: "Revisa el filtro",
      detail: validationError,
      life: 3000,
    });
    return;
  }
  loading.value = true;
  try {
    const res = await reportesApi.getHistorial(
      p,
      PAGE_SIZE,
      estadoFiltro.value || undefined,
    );
    const data = res.data.data;
    items.value = data.content;
    totalPages.value = data.totalPages;
    totalElements.value = data.totalElements;
    page.value = data.number;
  } catch {
    toast.add({
      severity: "error",
      summary: "Error al cargar historial",
      life: 3000,
    });
  } finally {
    loading.value = false;
  }
}

function prev() {
  if (page.value > 0) cargar(page.value - 1);
}

function next() {
  if (page.value < totalPages.value - 1) cargar(page.value + 1);
}

function fmtFecha(s: string | null) {
  if (!s) return "--";
  return new Date(s).toLocaleString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtSol(n: number) {
  return `S/ ${Number(n ?? 0).toFixed(2)}`;
}

async function verDetalle(id: number) {
  try {
    detalle.value = (await reportesApi.getHistorialDetalle(id)).data.data;
    detalleDialog.value = true;
  } catch {
    toast.add({ severity: "error", summary: "Error al cargar detalle", life: 3000 });
  }
}

async function verPdf(id: number) {
  const guardado = loadComprobantePdfData(id);
  if (guardado) {
    openComprobantePdf(guardado);
    return;
  }
  try {
    const data = (await reportesApi.getHistorialDetalle(id)).data.data;
    const pdfData = {
      comprobanteId: data.comprobanteId,
      pedidoId: data.pedidoId,
      tipoComprobante: data.tipoComprobante,
      serie: data.serie,
      numero: data.numero,
      metodoPago: data.metodoPago,
      subtotal: data.subtotal,
      igv: data.igv,
      descuento: data.descuento,
      total: data.total,
      efectivoRecibido: data.efectivoRecibido,
      vuelto: data.vuelto,
      pagadoEn: data.pagadoEn,
      clienteDocumento: data.clienteDocumento ?? "",
      clienteNombre: data.clienteNombre ?? "",
      clienteDireccion: data.clienteDireccion ?? "",
      negocioNombre: data.negocioNombre ?? "",
      negocioRuc: data.negocioRuc ?? "",
      negocioDireccion: data.negocioDireccion ?? "",
      negocioLogoUrl: data.negocioLogoUrl ?? "",
      items: data.items.map((item) => ({
        producto: item.producto,
        cantidad: item.cantidad,
        precio: item.precio,
        subtotal: item.subtotal,
        observaciones: item.observaciones,
      })),
    };
    saveComprobantePdfData(pdfData);
    openComprobantePdf(pdfData);
  } catch {
    toast.add({ severity: "error", summary: "PDF no disponible", life: 3000 });
  }
}

const estadoClass = (e: string) => ({
  "badge-ok": e === "COMPLETADO",
  "badge-danger": e === "ANULADO",
  "badge-pending": e === "PENDIENTE",
});

onMounted(() => cargar());
</script>

<template>
  <div class="section-page">
    <Toast />

    <div class="section-header">
      <div>
        <h1 class="section-title">
          <i class="pi pi-history"></i> Historial de Comprobantes
        </h1>
        <p class="section-sub">{{ totalElements }} registros en total</p>
      </div>
      <div class="filters-row">
        <Select
          v-model="estadoFiltro"
          :options="estadoOpts"
          optionLabel="label"
          optionValue="value"
          placeholder="Estado"
          size="small"
        />
        <Button
          label="Filtrar"
          icon="pi pi-filter"
          size="small"
          :loading="loading"
          @click="cargar(0)"
        />
      </div>
    </div>

    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Pedido</th>
            <th>Metodo</th>
            <th>Total</th>
            <th>Estado</th>
            <th>Pagado</th>
            <th>Creado</th>
            <th>PDF</th>
            <th>Detalle</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="9" class="empty-cell">
              <i class="pi pi-spinner pi-spin"></i> Cargando...
            </td>
          </tr>
          <tr v-else-if="items.length === 0">
            <td colspan="9" class="empty-cell">Sin registros</td>
          </tr>
          <tr v-for="c in items" :key="c.id">
            <td class="mono">{{ c.id }}</td>
            <td class="mono">P-{{ c.pedidoId }}</td>
            <td>{{ c.metodoPago ?? "--" }}</td>
            <td class="mono bold">{{ fmtSol(c.total) }}</td>
            <td>
              <span class="badge" :class="estadoClass(c.estado ?? '')">
                {{ c.estado }}
              </span>
            </td>
            <td>{{ fmtFecha(c.pagadoEn) }}</td>
            <td>{{ fmtFecha(c.creadoEn) }}</td>
            <td>
              <Button icon="pi pi-file-pdf" text rounded size="small" @click="verPdf(c.id)" />
            </td>
            <td>
              <Button icon="pi pi-eye" text rounded size="small" @click="verDetalle(c.id)" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Dialog v-model:visible="detalleDialog" header="Detalle del pedido" modal :style="{ width: '620px' }">
      <div v-if="detalle" class="detalle-box">
        <div class="detalle-head">
          <strong>{{ detalle.tipoComprobante }} {{ detalle.serie }}-{{ String(detalle.numero).padStart(8, "0") }}</strong>
          <span>{{ fmtSol(detalle.total) }}</span>
        </div>
        <table class="data-table">
          <thead><tr><th>Producto</th><th>Cant.</th><th>Precio</th><th>Subtotal</th></tr></thead>
          <tbody>
            <tr v-for="item in detalle.items" :key="`${item.producto}-${item.cantidad}`">
              <td>{{ item.producto }}</td>
              <td>{{ item.cantidad }}</td>
              <td>{{ fmtSol(item.precio) }}</td>
              <td>{{ fmtSol(item.subtotal) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Dialog>

    <div class="pagination-row">
      <Button icon="pi pi-chevron-left" text size="small" :disabled="page === 0" @click="prev" />
      <span class="page-info">Pagina {{ page + 1 }} de {{ totalPages || 1 }}</span>
      <Button icon="pi pi-chevron-right" text size="small" :disabled="page >= totalPages - 1" @click="next" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.section-page {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.section-title {
  font-family: $font-heading;
  font-size: 1.1rem;
  font-weight: 700;
  color: $text-primary;
  margin: 0;
  i {
    margin-right: 0.4rem;
    font-size: 0.95rem;
    color: $amber-dark;
  }
}

.section-sub {
  font-size: 0.75rem;
  color: $text-muted;
  margin: 0.15rem 0 0;
}

.filters-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.table-wrap {
  background: $bg-card;
  border: 1px solid $border-subtle;
  border-radius: $r-md;
  overflow: hidden;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;

  th {
    background: $bg-surface;
    padding: 0.6rem 0.9rem;
    text-align: left;
    font-size: 0.68rem;
    font-weight: 600;
    color: $text-muted;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid $border-medium;
  }

  td {
    padding: 0.6rem 0.9rem;
    border-bottom: 1px solid $border-subtle;
    color: $text-primary;
    &.mono {
      font-family: $font-mono;
      font-size: 0.78rem;
    }
    &.bold {
      font-weight: 700;
    }
    &.empty-cell {
      text-align: center;
      color: $text-dim;
      padding: 2rem;
    }
  }

  tr:last-child td {
    border-bottom: none;
  }
  tr:hover td {
    background: $bg-hover;
  }
}

.badge {
  display: inline-block;
  padding: 0.2rem 0.55rem;
  border-radius: $r-full;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.04em;

  &-ok {
    background: $c-green-bg;
    color: $c-green;
  }
  &-danger {
    background: $c-red-bg;
    color: $c-red;
  }
  &-pending {
    background: $amber-bg;
    color: $amber-dark;
  }
}

.pagination-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}

.page-info {
  font-size: 0.78rem;
  color: $text-muted;
}

.detalle-box {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.detalle-head {
  display: flex;
  justify-content: space-between;
  color: $text-primary;
}
</style>
