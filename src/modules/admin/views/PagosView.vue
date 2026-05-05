<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useToast } from "primevue/usetoast";
import Toast from "primevue/toast";
import Button from "primevue/button";
import Chart from "primevue/chart";
import {
  reportesApi,
  type VentasPorMetodo,
} from "@/modules/admin/api/reportesApi";

const toast = useToast();

const data = ref<VentasPorMetodo[] | null>(null);
const loading = ref(false);

// Fecha de hoy como rango ISO
const desde = computed(() => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
});

const hasta = computed(() => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
});

const total = computed(() =>
  (data.value ?? []).reduce((acc, m) => acc + Number(m.total), 0),
);

const METODO_ICONS: Record<string, string> = {
  EFECTIVO: "pi pi-money-bill",
  YAPE: "pi pi-mobile",
  TARJETA: "pi pi-credit-card",
  PLIN: "pi pi-mobile",
  TRANSFERENCIA: "pi pi-building-columns",
};

const METODO_COLORS: Record<string, string> = {
  EFECTIVO: "#16a34a",
  YAPE: "#7c3aed",
  TARJETA: "#2563eb",
  PLIN: "#0891b2",
  TRANSFERENCIA: "#d97706",
};

const CHART_BG = [
  "#D67B93",
  "#6B8E6E",
  "#d97706",
  "#2563eb",
  "#9333ea",
  "#16a34a",
  "#0891b2",
];

const chartData = computed(() => {
  const metodos = data.value ?? [];
  return {
    labels: metodos.map((m) => m.metodo),
    datasets: [
      {
        data: metodos.map((m) => Number(m.total)),
        backgroundColor: CHART_BG.slice(0, metodos.length),
        hoverOffset: 6,
        borderWidth: 2,
        borderColor: "#ffffff",
      },
    ],
  };
});

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: "68%",
  plugins: {
    legend: {
      position: "right" as const,
      labels: { font: { size: 11 }, padding: 14, boxWidth: 12, boxHeight: 12 },
    },
    tooltip: {
      callbacks: {
        label: (ctx: { label: string; parsed: number }) =>
          ` ${ctx.label}: S/ ${Number(ctx.parsed).toFixed(2)}`,
      },
    },
  },
};

function metodoIcon(metodo: string) {
  return METODO_ICONS[metodo] ?? "pi pi-wallet";
}

function metodoColor(metodo: string) {
  return METODO_COLORS[metodo] ?? "#6b7280";
}

function formatFechaHoy() {
  return new Date().toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

async function cargar() {
  loading.value = true;
  try {
    const res = await reportesApi.getVentas(desde.value, hasta.value);
    data.value = res.data.data.ventasPorMetodo;
  } catch {
    toast.add({
      severity: "error",
      summary: "Error al cargar métodos de pago",
      life: 3000,
    });
  } finally {
    loading.value = false;
  }
}

onMounted(cargar);
</script>

<template>
  <div class="section-page">
    <Toast />

    <!-- Header -->
    <div class="section-header">
      <div>
        <h1 class="section-title">
          <i class="pi pi-credit-card"></i> Métodos de Pago
        </h1>
        <p class="section-sub">Desglose de ventas por método</p>
      </div>
      <Button
        icon="pi pi-refresh"
        size="small"
        text
        @click="cargar"
        :loading="loading"
        v-tooltip.top="'Actualizar'"
      />
    </div>

    <!-- Filtro de fecha (readonly hoy) -->
    <div class="filter-row">
      <i class="pi pi-calendar"></i>
      <span class="filter-label">Mostrando:</span>
      <span class="filter-date">{{ formatFechaHoy() }}</span>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="empty-state">
      <i class="pi pi-spinner pi-spin"></i> Cargando…
    </div>

    <template v-else-if="data !== null">
      <!-- Stat cards -->
      <div class="pagos-grid">
        <div
          v-for="m in data"
          :key="m.metodo"
          class="pago-card"
          :style="{ '--metodo-color': metodoColor(m.metodo) }"
        >
          <div class="pago-card-header">
            <div class="pago-icon-wrap">
              <i :class="metodoIcon(m.metodo)"></i>
            </div>
            <span class="pago-metodo">{{ m.metodo }}</span>
          </div>
          <div class="pago-total">S/ {{ Number(m.total).toFixed(2) }}</div>
          <div class="pago-count">
            {{ m.cantidad }} transacción{{ m.cantidad !== 1 ? "es" : "" }}
          </div>
        </div>

        <!-- Total -->
        <div class="pago-card pago-card--total">
          <div class="pago-card-header">
            <div class="pago-icon-wrap total-icon">
              <i class="pi pi-chart-bar"></i>
            </div>
            <span class="pago-metodo">TOTAL</span>
          </div>
          <div class="pago-total total-highlight">
            S/ {{ total.toFixed(2) }}
          </div>
          <div class="pago-count">
            {{ (data ?? []).reduce((a, m) => a + m.cantidad, 0) }} transacciones
          </div>
        </div>
      </div>

      <!-- Donut chart -->
      <div v-if="data.length > 0" class="chart-card">
        <p class="chart-title">Distribución de ventas</p>
        <div class="chart-wrap">
          <Chart type="doughnut" :data="chartData" :options="chartOptions" />
        </div>
      </div>

      <div v-else class="empty-state">Sin ventas registradas hoy</div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.section-page {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
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
    color: $c-blue;
  }
}

.section-sub {
  font-size: 0.75rem;
  color: $text-muted;
  margin: 0.15rem 0 0;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  color: $text-muted;
  background: $bg-surface;
  border: 1px solid $border-subtle;
  border-radius: $r-sm;
  padding: 0.5rem 0.85rem;
  width: fit-content;

  i {
    font-size: 0.75rem;
    color: $text-dim;
  }
}

.filter-label {
  color: $text-dim;
}

.filter-date {
  font-weight: 600;
  color: $text-primary;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: $text-dim;
  font-size: 0.85rem;
}

.pagos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 0.75rem;
}

.pago-card {
  background: $bg-card;
  border: 1px solid $border-subtle;
  border-radius: $r-md;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;

  &--total {
    border-color: $border-medium;
  }
}

.pago-card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.pago-icon-wrap {
  width: 28px;
  height: 28px;
  border-radius: $r-sm;
  background: color-mix(
    in srgb,
    var(--metodo-color, #{$c-blue}) 12%,
    transparent
  );
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  i {
    font-size: 0.8rem;
    color: var(--metodo-color, #{$c-blue});
  }

  &.total-icon {
    background: $amber-bg;

    i {
      color: $amber;
    }
  }
}

.pago-metodo {
  font-size: 0.68rem;
  font-weight: 700;
  color: $text-dim;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.pago-total {
  font-size: 1.05rem;
  font-weight: 700;
  color: $text-primary;
  font-family: $font-mono;

  &.total-highlight {
    color: $amber-dark;
  }
}

.pago-count {
  font-size: 0.72rem;
  color: $text-muted;
}

.chart-card {
  background: $bg-card;
  border: 1px solid $border-subtle;
  border-radius: $r-md;
  padding: 1.25rem 1.5rem;
}

.chart-title {
  font-size: 0.78rem;
  font-weight: 600;
  color: $text-muted;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin: 0 0 1rem;
}

.chart-wrap {
  height: 220px;
}
</style>
