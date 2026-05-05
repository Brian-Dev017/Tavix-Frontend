<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useToast } from "primevue/usetoast";
import Toast from "primevue/toast";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import Chart from "primevue/chart";
import {
  reportesApi,
  type ReporteVentas,
} from "@/modules/admin/api/reportesApi";

const toast = useToast();

const desde = ref<Date>(
  (() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d;
  })(),
);
const hasta = ref<Date>(new Date());
const loading = ref(false);
const reporte = ref<ReporteVentas | null>(null);

function fmtDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fmtSol(n: number | null | undefined) {
  return `S/ ${Number(n ?? 0).toFixed(2)}`;
}

async function cargar() {
  loading.value = true;
  try {
    const res = await reportesApi.getVentas(
      fmtDate(desde.value),
      fmtDate(hasta.value),
    );
    reporte.value = res.data.data;
  } catch {
    toast.add({
      severity: "error",
      summary: "Error al cargar ventas",
      life: 3000,
    });
  } finally {
    loading.value = false;
  }
}

const barData = computed(() => {
  const dias = reporte.value?.ventasPorDia ?? [];
  return {
    labels: dias.map((d) => d.fecha.substring(5)),
    datasets: [
      {
        label: "Ventas (S/)",
        data: dias.map((d) => Number(d.total)),
        backgroundColor: "#D67B93",
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  };
});

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 11 } } },
    y: {
      grid: { color: "#f0ede9" },
      ticks: { font: { size: 11 }, callback: (v: number) => `S/ ${v}` },
    },
  },
};

const donutData = computed(() => {
  const metodos = reporte.value?.ventasPorMetodo ?? [];
  const COLORS = [
    "#D67B93",
    "#6B8E6E",
    "#d97706",
    "#2563eb",
    "#9333ea",
    "#16a34a",
  ];
  return {
    labels: metodos.map((m) => m.metodo),
    datasets: [
      {
        data: metodos.map((m) => Number(m.total)),
        backgroundColor: COLORS.slice(0, metodos.length),
        borderWidth: 2,
        borderColor: "#fff",
      },
    ],
  };
});

const donutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: "70%",
  plugins: {
    legend: { position: "right", labels: { font: { size: 11 }, boxWidth: 12 } },
  },
};

onMounted(cargar);
</script>

<template>
  <div class="section-page">
    <Toast />

    <div class="section-header">
      <div>
        <h1 class="section-title" style="color: var(--c-green, #16a34a)">
          <i class="pi pi-chart-bar"></i> Reporte de Ventas
        </h1>
        <p class="section-sub">Ingresos por período</p>
      </div>
      <div class="filters-row">
        <DatePicker
          v-model="desde"
          dateFormat="yy-mm-dd"
          placeholder="Desde"
          :showIcon="true"
        />
        <DatePicker
          v-model="hasta"
          dateFormat="yy-mm-dd"
          placeholder="Hasta"
          :showIcon="true"
        />
        <Button
          label="Consultar"
          icon="pi pi-search"
          size="small"
          :loading="loading"
          @click="cargar"
        />
      </div>
    </div>

    <div v-if="loading" class="empty-state">
      <i class="pi pi-spinner pi-spin"></i> Cargando…
    </div>
    <template v-else-if="reporte">
      <!-- KPI strip -->
      <div class="kpi-row">
        <div class="kpi-card">
          <span class="kpi-label">Total ventas</span>
          <span class="kpi-value kpi-green">{{
            fmtSol(reporte.totalVentas)
          }}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Comprobantes</span>
          <span class="kpi-value">{{ reporte.cantidadComprobantes }}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Ticket promedio</span>
          <span class="kpi-value kpi-amber">{{
            fmtSol(reporte.promedioVenta)
          }}</span>
        </div>
      </div>

      <!-- Charts -->
      <div class="charts-row">
        <div class="chart-card">
          <p class="chart-label">Ventas por día</p>
          <div class="chart-wrap">
            <Chart type="bar" :data="barData" :options="barOptions" />
          </div>
        </div>
        <div class="chart-card">
          <p class="chart-label">Por método de pago</p>
          <div class="chart-wrap">
            <Chart type="doughnut" :data="donutData" :options="donutOptions" />
          </div>
        </div>
      </div>

      <!-- Table days -->
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Comprobantes</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in reporte.ventasPorDia" :key="d.fecha">
              <td>{{ d.fecha }}</td>
              <td>{{ d.cantidad }}</td>
              <td>{{ fmtSol(d.total) }}</td>
            </tr>
            <tr v-if="reporte.ventasPorDia.length === 0">
              <td colspan="3" class="empty-cell">Sin ventas en el período</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
    <div v-else class="empty-state">Selecciona un rango y consulta.</div>
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
  flex-wrap: wrap;
}

.kpi-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.85rem;
}

.kpi-card {
  background: $bg-card;
  border: 1px solid $border-subtle;
  border-radius: $r-md;
  padding: 1rem 1.2rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.kpi-label {
  font-size: 0.72rem;
  color: $text-muted;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.kpi-value {
  font-family: $font-mono;
  font-size: 1.3rem;
  font-weight: 700;
  color: $text-primary;
  &.kpi-green {
    color: $c-green;
  }
  &.kpi-amber {
    color: $amber-dark;
  }
}

.charts-row {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 0.85rem;
}

.chart-card {
  background: $bg-card;
  border: 1px solid $border-subtle;
  border-radius: $r-md;
  padding: 1rem;
}

.chart-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: $text-muted;
  margin: 0 0 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.chart-wrap {
  height: 220px;
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
    padding: 0.65rem 1rem;
    text-align: left;
    font-size: 0.68rem;
    font-weight: 600;
    color: $text-muted;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid $border-medium;
  }

  td {
    padding: 0.65rem 1rem;
    border-bottom: 1px solid $border-subtle;
    color: $text-primary;
    &:last-child {
      font-family: $font-mono;
      font-weight: 600;
      color: $c-green;
    }
    &.empty-cell {
      text-align: center;
      color: $text-dim;
      padding: 1.5rem;
    }
  }

  tr:last-child td {
    border-bottom: none;
  }
  tr:hover td {
    background: $bg-hover;
  }
}

.empty-state {
  text-align: center;
  color: $text-dim;
  font-size: 0.82rem;
  padding: 2rem;
}
</style>
