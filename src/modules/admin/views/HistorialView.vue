<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useToast } from "primevue/usetoast";
import Toast from "primevue/toast";
import Button from "primevue/button";
import Select from "primevue/select";
import {
  reportesApi,
  type ComprobanteHistorial,
} from "@/modules/admin/api/reportesApi";

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

async function cargar(p = 0) {
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
  if (!s) return "—";
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
            <th>Método</th>
            <th>Total</th>
            <th>Estado</th>
            <th>Pagado</th>
            <th>Creado</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="7" class="empty-cell">
              <i class="pi pi-spinner pi-spin"></i> Cargando…
            </td>
          </tr>
          <tr v-else-if="items.length === 0">
            <td colspan="7" class="empty-cell">Sin registros</td>
          </tr>
          <tr v-for="c in items" :key="c.id">
            <td class="mono">{{ c.id }}</td>
            <td class="mono">P-{{ c.pedidoId }}</td>
            <td>{{ c.metodoPago ?? "—" }}</td>
            <td class="mono bold">{{ fmtSol(c.total) }}</td>
            <td>
              <span class="badge" :class="estadoClass(c.estado ?? '')">{{
                c.estado
              }}</span>
            </td>
            <td>{{ fmtFecha(c.pagadoEn) }}</td>
            <td>{{ fmtFecha(c.creadoEn) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="pagination-row">
      <Button
        icon="pi pi-chevron-left"
        text
        size="small"
        :disabled="page === 0"
        @click="prev"
      />
      <span class="page-info"
        >Página {{ page + 1 }} de {{ totalPages || 1 }}</span
      >
      <Button
        icon="pi pi-chevron-right"
        text
        size="small"
        :disabled="page >= totalPages - 1"
        @click="next"
      />
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
</style>
