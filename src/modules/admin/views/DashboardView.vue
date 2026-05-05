<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "primevue/usetoast";
import Toast from "primevue/toast";
import Chart from "primevue/chart";
import {
  reportesApi,
  type DashboardData,
  type VentasPorMetodo,
} from "@/modules/admin/api/reportesApi";
import { adminApi } from "@/modules/admin/api/adminApi";
import { mesasApi } from "@/modules/mesas/api/mesasApi";

const router = useRouter();
const toast = useToast();

const loading = ref(true);
const dashboard = ref<DashboardData | null>(null);
const mesasOcupadas = ref(0);
const usuariosActivos = ref(0);
const pedidosActivos = ref<
  { mesaNumero: string; items: number; total: number; estado: string }[]
>([]);

const today = computed(() =>
  new Date().toLocaleDateString("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }),
);

// Chart data
const barChartData = computed(() => {
  const metodos = dashboard.value?.ventasPorMetodo ?? [];
  const labels = metodos.map((m) => m.metodo);
  const totals = metodos.map((m) => Number(m.total));
  return {
    labels,
    datasets: [
      {
        label: "Ventas (S/)",
        data: totals,
        backgroundColor: [
          "#D67B93",
          "#6B8E6E",
          "#d97706",
          "#2563eb",
          "#9333ea",
          "#16a34a",
        ],
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  };
});

const barChartOptions = {
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

const donutChartData = computed(() => {
  const metodos: VentasPorMetodo[] = dashboard.value?.ventasPorMetodo ?? [];
  return {
    labels: metodos.map((m) => m.metodo),
    datasets: [
      {
        data: metodos.map((m) => Number(m.total)),
        backgroundColor: [
          "#D67B93",
          "#C8517A",
          "#6B8E6E",
          "#d97706",
          "#2563eb",
          "#9333ea",
        ],
        hoverOffset: 6,
        borderWidth: 2,
        borderColor: "#ffffff",
      },
    ],
  };
});

const donutChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: "70%",
  plugins: {
    legend: {
      position: "right" as const,
      labels: { font: { size: 11 }, padding: 12, boxWidth: 12, boxHeight: 12 },
    },
  },
};

async function cargar() {
  loading.value = true;
  try {
    const [resDash, resMesas, resUsuarios] = await Promise.all([
      reportesApi.getDashboard().catch(() => null),
      mesasApi.listar().catch(() => null),
      adminApi.listarUsuarios().catch(() => null),
    ]);
    dashboard.value = resDash?.data?.data ?? null;
    mesasOcupadas.value = (resMesas?.data?.data ?? []).filter(
      (m: { estado: string }) => m.estado === "OCUPADA",
    ).length;
    usuariosActivos.value = (resUsuarios?.data?.data ?? []).filter(
      (u: { activo: boolean }) => u.activo,
    ).length;
  } catch {
    toast.add({
      severity: "error",
      summary: "Error al cargar dashboard",
      life: 3000,
    });
  } finally {
    loading.value = false;
  }
}

onMounted(cargar);
</script>

<template>
  <div class="dash-page">
    <Toast />

    <!-- Header -->
    <div class="dash-header">
      <div>
        <h1 class="dash-title">Dashboard</h1>
        <p class="dash-sub">{{ today }}</p>
      </div>
      <div class="dash-header-right">
        <button class="dash-alert-btn" @click="router.push('/admin/stock')">
          <i class="pi pi-exclamation-triangle"></i>
          <span>Revisar stock</span>
        </button>
        <div class="dash-ventas-badge">
          <i class="pi pi-dollar"></i>
          <span>S/ {{ dashboard?.ventasHoy?.toFixed(2) ?? "0.00" }}</span>
        </div>
      </div>
    </div>

    <!-- Stat cards -->
    <div class="dash-stats" v-if="!loading">
      <div class="stat-card">
        <div class="stat-icon si-rose"><i class="pi pi-dollar"></i></div>
        <div class="stat-body">
          <span class="stat-val"
            >S/ {{ dashboard?.ventasHoy?.toFixed(2) ?? "0.00" }}</span
          >
          <span class="stat-lbl">Ventas hoy</span>
        </div>
        <div class="stat-badge badge-green">+hoy</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon si-blue"><i class="pi pi-shopping-bag"></i></div>
        <div class="stat-body">
          <span class="stat-val">{{ dashboard?.pedidosHoy ?? 0 }}</span>
          <span class="stat-lbl">Pedidos hoy</span>
        </div>
        <div class="stat-badge badge-blue">
          +{{ dashboard?.pedidosHoy ?? 0 }}
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon si-amber"><i class="pi pi-table"></i></div>
        <div class="stat-body">
          <span class="stat-val">{{ mesasOcupadas }}</span>
          <span class="stat-lbl">Mesas ocupadas</span>
        </div>
        <div class="stat-badge badge-amber">/ 10</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon si-indigo"><i class="pi pi-users"></i></div>
        <div class="stat-body">
          <span class="stat-val">{{ usuariosActivos }}</span>
          <span class="stat-lbl">Personal activo</span>
        </div>
        <div class="stat-badge badge-indigo">activos</div>
      </div>
    </div>
    <div class="dash-stats" v-else>
      <div v-for="i in 4" :key="i" class="stat-card stat-skeleton"></div>
    </div>

    <!-- Charts row -->
    <div class="dash-charts">
      <!-- Bar chart: ventas por método -->
      <div class="chart-card chart-bar-wrap">
        <div class="chart-card-header">
          <div>
            <div class="chart-title">Ventas de la semana</div>
            <div class="chart-sub">Ingresos diarios en S/</div>
          </div>
        </div>
        <div
          class="bar-chart-body"
          v-if="!loading && (dashboard?.ventasPorMetodo?.length ?? 0) > 0"
        >
          <Chart
            type="bar"
            :data="barChartData"
            :options="barChartOptions"
            style="height: 200px"
          />
        </div>
        <div class="chart-empty" v-else-if="!loading">
          <i class="pi pi-chart-bar"></i>
          <p>Sin ventas registradas hoy</p>
        </div>
        <div class="chart-skeleton" v-else></div>
      </div>

      <!-- Platos más vendidos -->
      <div class="chart-card chart-platos-wrap">
        <div class="chart-card-header">
          <div class="chart-title">Platos más vendidos</div>
        </div>
        <div class="platos-list" v-if="!loading">
          <div
            v-if="(dashboard?.platosVendidos?.length ?? 0) === 0"
            class="chart-empty"
          >
            <i class="pi pi-utensils"></i>
            <p>Sin datos de platos hoy</p>
          </div>
          <div
            v-for="(p, idx) in (dashboard?.platosVendidos ?? []).slice(0, 5)"
            :key="p.productoId"
            class="plato-row"
          >
            <span class="plato-rank">{{ idx + 1 }}</span>
            <span class="plato-nombre">{{ p.nombre }}</span>
            <div class="plato-bar-wrap">
              <div
                class="plato-bar"
                :style="{
                  width: `${Math.round((p.cantidad / ((dashboard?.platosVendidos?.[0]?.cantidad ?? 1) || 1)) * 100)}%`,
                }"
              ></div>
            </div>
            <span class="plato-qty">{{ p.cantidad }}</span>
          </div>
        </div>
        <div class="chart-skeleton" v-else></div>
      </div>
    </div>

    <!-- Second row: Pedidos activos + Métodos de pago -->
    <div class="dash-bottom">
      <!-- Pedidos activos (from dashboard) -->
      <div class="chart-card">
        <div class="chart-card-header">
          <div class="chart-title">Pedidos activos</div>
          <span class="badge-count">{{ dashboard?.pedidosHoy ?? 0 }}</span>
        </div>
        <div class="pedidos-empty" v-if="!loading && !dashboard?.pedidosHoy">
          <i class="pi pi-inbox" style="font-size: 2rem; opacity: 0.15"></i>
          <p>No hay pedidos activos</p>
        </div>
        <div class="pedidos-list" v-else-if="!loading">
          <p class="pedidos-hint">
            {{ dashboard?.pedidosHoy }} pedido(s) procesados hoy
          </p>
        </div>
        <div class="chart-skeleton" v-else></div>
      </div>

      <!-- Métodos de pago (donut) -->
      <div class="chart-card">
        <div class="chart-card-header">
          <div class="chart-title">Métodos de pago hoy</div>
        </div>
        <div
          class="donut-body"
          v-if="!loading && (dashboard?.ventasPorMetodo?.length ?? 0) > 0"
        >
          <Chart
            type="doughnut"
            :data="donutChartData"
            :options="donutChartOptions"
            style="height: 180px"
          />
        </div>
        <div class="chart-empty" v-else-if="!loading">
          <i class="pi pi-chart-pie"></i>
          <p>Sin pagos registrados hoy</p>
        </div>
        <div class="chart-skeleton" v-else></div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.dash-page {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  min-height: 100%;
}

.dash-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.dash-title {
  font-family: $font-heading;
  font-size: 1.2rem;
  font-weight: 700;
  color: $text-primary;
  letter-spacing: -0.025em;
  margin: 0;
}

.dash-sub {
  font-size: 0.78rem;
  color: $text-muted;
  margin: 0.15rem 0 0;
  text-transform: capitalize;
}

.dash-header-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.dash-alert-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.85rem;
  border: 1px solid rgba(217, 119, 6, 0.3);
  background: $c-yellow-bg;
  color: $c-yellow;
  border-radius: $r-full;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  font-family: $font-body;
  transition: all 0.15s;

  &:hover {
    background: rgba(217, 119, 6, 0.15);
  }
  i {
    font-size: 0.7rem;
  }
}

.dash-ventas-badge {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.85rem;
  border: 1px solid rgba(200, 81, 122, 0.25);
  background: $amber-bg;
  color: $amber-dark;
  border-radius: $r-full;
  font-size: 0.78rem;
  font-weight: 700;
  i {
    font-size: 0.7rem;
  }
}

// Stat cards
.dash-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.85rem;
}

.stat-card {
  background: $bg-card;
  border: 1px solid $border-subtle;
  border-radius: $r-md;
  padding: 1rem 1.1rem;
  display: flex;
  align-items: center;
  gap: 0.85rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: box-shadow 0.2s;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.07);
  }

  &.stat-skeleton {
    min-height: 72px;
    background: linear-gradient(
      90deg,
      $bg-surface 25%,
      $bg-card 50%,
      $bg-surface 75%
    );
    background-size: 400px 100%;
    animation: shimmer 1.2s linear infinite;
    border-color: transparent;
  }
}

.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: $r-md;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  flex-shrink: 0;

  &.si-rose {
    background: $amber-bg;
    color: $amber-dark;
    border: 1px solid rgba(200, 81, 122, 0.2);
  }
  &.si-blue {
    background: $c-blue-bg;
    color: $c-blue;
    border: 1px solid rgba(37, 99, 235, 0.15);
  }
  &.si-amber {
    background: $c-yellow-bg;
    color: $c-yellow;
    border: 1px solid rgba(217, 119, 6, 0.2);
  }
  &.si-indigo {
    background: $violet-bg;
    color: $violet;
    border: 1px solid rgba(107, 142, 110, 0.2);
  }
  &.si-green {
    background: $c-green-bg;
    color: $c-green;
    border: 1px solid rgba(22, 163, 74, 0.2);
  }
}

.stat-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.stat-val {
  font-family: $font-heading;
  font-size: 1.3rem;
  font-weight: 700;
  color: $text-primary;
  line-height: 1.2;
  letter-spacing: -0.03em;
}

.stat-lbl {
  font-size: 0.72rem;
  color: $text-muted;
}

.stat-badge {
  font-size: 0.68rem;
  font-weight: 700;
  padding: 0.15rem 0.45rem;
  border-radius: $r-full;

  &.badge-green {
    background: $c-green-bg;
    color: $c-green;
  }
  &.badge-blue {
    background: $c-blue-bg;
    color: $c-blue;
  }
  &.badge-amber {
    background: $c-yellow-bg;
    color: $c-yellow;
  }
  &.badge-indigo {
    background: $violet-bg;
    color: $violet;
  }
}

// Chart cards
.dash-charts,
.dash-bottom {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.85rem;
}

.chart-card {
  background: $bg-card;
  border: 1px solid $border-subtle;
  border-radius: $r-md;
  padding: 1.1rem 1.25rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.chart-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 0.85rem;
}

.chart-title {
  font-family: $font-heading;
  font-size: 0.88rem;
  font-weight: 700;
  color: $text-primary;
  letter-spacing: -0.01em;
}

.chart-sub {
  font-size: 0.7rem;
  color: $text-muted;
  margin-top: 0.1rem;
}

.badge-count {
  background: $amber-bg;
  color: $amber-dark;
  border: 1px solid rgba(200, 81, 122, 0.2);
  border-radius: $r-full;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.15rem 0.5rem;
}

.chart-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 2rem 1rem;
  color: $text-dim;
  font-size: 0.78rem;
  text-align: center;
  i {
    font-size: 1.5rem;
    opacity: 0.2;
  }
}

.chart-skeleton {
  height: 180px;
  background: linear-gradient(
    90deg,
    $bg-surface 25%,
    $bg-card 50%,
    $bg-surface 75%
  );
  background-size: 400px 100%;
  animation: shimmer 1.2s linear infinite;
  border-radius: $r-sm;
}

.bar-chart-body {
  padding: 0.25rem 0;
}

// Platos
.platos-list {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.plato-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.plato-rank {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: $amber-bg;
  color: $amber-dark;
  font-size: 0.65rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.plato-nombre {
  font-size: 0.8rem;
  font-weight: 500;
  color: $text-primary;
  width: 130px;
  flex-shrink: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.plato-bar-wrap {
  flex: 1;
  height: 6px;
  background: $bg-surface;
  border-radius: $r-full;
  overflow: hidden;
}

.plato-bar {
  height: 100%;
  background: $amber;
  border-radius: $r-full;
  transition: width 0.6s ease;
}

.plato-qty {
  font-family: $font-mono;
  font-size: 0.75rem;
  color: $text-muted;
  width: 24px;
  text-align: right;
}

// Pedidos
.pedidos-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1.5rem;
  color: $text-dim;
  font-size: 0.78rem;
}

.pedidos-hint {
  font-size: 0.8rem;
  color: $text-muted;
  padding: 0.5rem 0;
}

.donut-body {
  padding: 0.25rem 0;
}

// Responsive
@media (max-width: 1024px) {
  .dash-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .dash-page {
    padding: 1rem;
  }
  .dash-stats {
    grid-template-columns: 1fr 1fr;
  }
  .dash-charts,
  .dash-bottom {
    grid-template-columns: 1fr;
  }
}
</style>
