<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useToast } from "primevue/usetoast";
import Toast from "primevue/toast";
import Button from "primevue/button";
import {
  reportesApi,
  type ComprobanteHistorial,
} from "@/modules/admin/api/reportesApi";

const toast = useToast();

const items = ref<ComprobanteHistorial[]>([]);
const loading = ref(false);

async function cargar() {
  loading.value = true;
  try {
    // Fetch a broad set and filter client-side for ANULADO/CANCELADO
    const res = await reportesApi.getHistorial(0, 100);
    items.value = res.data.data.content.filter(
      (c) => c.estado === "ANULADO" || c.estado === "CANCELADO",
    );
  } catch {
    toast.add({
      severity: "error",
      summary: "Error al cargar anulaciones",
      life: 3000,
    });
  } finally {
    loading.value = false;
  }
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

onMounted(cargar);
</script>

<template>
  <div class="section-page">
    <Toast />

    <div class="section-header">
      <div>
        <h1 class="section-title" style="color: var(--c-red, #ef4444)">
          <i class="pi pi-times-circle"></i> Anulaciones y Cancelaciones
        </h1>
        <p class="section-sub">{{ items.length }} comprobante(s) anulados</p>
      </div>
      <Button
        label="Actualizar"
        icon="pi pi-refresh"
        size="small"
        :loading="loading"
        @click="cargar"
      />
    </div>

    <!-- Info box -->
    <div class="info-box">
      <i class="pi pi-info-circle"></i>
      <span>
        Muestra comprobantes con estado <strong>ANULADO</strong> o
        <strong>CANCELADO</strong>. Para autorizar una nueva anulación, el
        proceso se realiza desde la vista de Caja.
      </span>
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
            <th>Creado</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="6" class="empty-cell">
              <i class="pi pi-spinner pi-spin"></i> Cargando…
            </td>
          </tr>
          <tr v-else-if="items.length === 0">
            <td colspan="6" class="empty-cell">
              <i
                class="pi pi-check-circle"
                style="color: var(--c-green, #16a34a); font-size: 1.2rem"
              ></i
              ><br />
              Sin anulaciones registradas
            </td>
          </tr>
          <tr v-for="c in items" :key="c.id">
            <td class="mono">{{ c.id }}</td>
            <td class="mono">P-{{ c.pedidoId }}</td>
            <td>{{ c.metodoPago ?? "—" }}</td>
            <td class="mono strike">{{ fmtSol(c.total) }}</td>
            <td>
              <span class="badge-danger">{{ c.estado }}</span>
            </td>
            <td>{{ fmtFecha(c.creadoEn) }}</td>
          </tr>
        </tbody>
      </table>
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
  margin: 0;
  i {
    margin-right: 0.4rem;
    font-size: 0.95rem;
  }
}

.section-sub {
  font-size: 0.75rem;
  color: $text-muted;
  margin: 0.15rem 0 0;
}

.info-box {
  background: rgba(234, 179, 8, 0.06);
  border: 1px solid rgba(234, 179, 8, 0.2);
  border-radius: $r-md;
  padding: 0.75rem 1rem;
  font-size: 0.78rem;
  color: $text-muted;
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;

  i {
    color: $c-yellow;
    margin-top: 2px;
    flex-shrink: 0;
  }
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
    &.strike {
      text-decoration: line-through;
      color: $text-dim;
    }
    &.empty-cell {
      text-align: center;
      color: $text-dim;
      padding: 2.5rem;
      line-height: 2;
    }
  }

  tr:last-child td {
    border-bottom: none;
  }
  tr:hover td {
    background: $bg-hover;
  }
}

.badge-danger {
  display: inline-block;
  padding: 0.2rem 0.55rem;
  border-radius: $r-full;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  background: $c-red-bg;
  color: $c-red;
}
</style>
