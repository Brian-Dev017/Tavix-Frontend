<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "primevue/usetoast";
import { mesasApi, type MesaDTO } from "@/modules/mesas/api/mesasApi";
import { performLogout } from "@/shared/auth/logout";
import { useRol } from "@/shared/composables/useRol";
import MesaCard from "@/modules/mesas/components/MesaCard.vue";

const router = useRouter();
const toast = useToast();
const { rolMeta, isAdmin, nombreCompleto } = useRol();

const mesas = ref<MesaDTO[]>([]);
const loading = ref(true);
const refreshing = ref(false);

const disponibles = computed(
  () => mesas.value.filter((m) => m.estado === "DISPONIBLE").length,
);
const ocupadas = computed(
  () => mesas.value.filter((m) => m.estado === "OCUPADA").length,
);
const reservadas = computed(
  () => mesas.value.filter((m) => m.estado === "RESERVADA").length,
);

async function cargarMesas(silent = false) {
  if (!silent) loading.value = true;
  refreshing.value = true;
  try {
    const res = await mesasApi.listar();
    mesas.value = res.data.data;
  } catch {
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "No se pudieron cargar las mesas",
      life: 3000,
    });
  } finally {
    loading.value = false;
    refreshing.value = false;
  }
}

async function handleMesaClick(mesa: MesaDTO) {
  if (mesa.estado === "DISPONIBLE") {
    try {
      const res = await mesasApi.abrirSesion(mesa.id);
      router.push({
        path: `/pedido/${res.data.data}`,
        query: { mesa: mesa.numero },
      });
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.add({
        severity: "error",
        summary: "Error",
        detail: err.response?.data?.message ?? "Error al abrir mesa",
        life: 3000,
      });
    }
  } else if (mesa.estado === "OCUPADA" && mesa.sesionId) {
    router.push({
      path: `/pedido/${mesa.sesionId}`,
      query: { mesa: mesa.numero },
    });
  }
}

async function handleLogout() {
  await performLogout();
  router.push("/login");
}

onMounted(() => cargarMesas());
</script>

<template>
  <div class="mesas-page app-page">
    <!-- Header -->
    <header class="page-header">
      <div>
        <h1 class="page-title">
          <i
            class="pi pi-table"
            style="
              color: var(--amber, #d67b93);
              margin-right: 0.4rem;
              font-size: 1rem;
            "
          ></i>
          Mesas
        </h1>
        <p class="page-subtitle">
          <span class="page-stat-dot dot-green"></span
          >{{ disponibles }} disponibles
          <span style="color: var(--border-medium, #d9d3ce)">·</span>
          <span class="page-stat-dot dot-red"></span>{{ ocupadas }} ocupadas
          <template v-if="reservadas > 0">
            <span style="color: var(--border-medium, #d9d3ce)">·</span>
            <span class="page-stat-dot dot-amber"></span
            >{{ reservadas }} reservadas
          </template>
        </p>
      </div>

      <div class="page-actions">
        <!-- Role badge -->
        <span
          class="rol-chip"
          :style="{
            color: rolMeta?.color,
            background: rolMeta?.bg,
            borderColor: rolMeta?.border,
          }"
        >
          <i :class="`pi ${rolMeta?.icon}`"></i>
          {{ rolMeta?.label }}
        </span>

        <span class="user-chip">
          <i class="pi pi-user"></i>
          {{ nombreCompleto }}
        </span>

        <button
          v-if="isAdmin"
          class="icon-btn back-btn"
          @click="router.push('/admin')"
          title="Panel admin"
        >
          <i class="pi pi-shield"></i>
        </button>

        <button
          class="icon-btn"
          @click="cargarMesas()"
          :class="{ spinning: refreshing }"
          title="Actualizar"
        >
          <i class="pi pi-sync"></i>
        </button>

        <button
          class="icon-btn danger"
          @click="handleLogout"
          title="Cerrar sesión"
        >
          <i class="pi pi-sign-out"></i>
        </button>
      </div>
    </header>

    <!-- Loading -->
    <div v-if="loading" class="page-loading">
      <div class="page-spinner"></div>
      <p>Cargando mesas...</p>
    </div>

    <!-- Content -->
    <main v-else class="mesas-content">
      <div class="mesas-section-label">
        {{ mesas.length }} mesa{{ mesas.length !== 1 ? "s" : "" }} en sala
      </div>

      <div class="mesas-grid">
        <MesaCard
          v-for="mesa in mesas"
          :key="mesa.id"
          :mesa="mesa"
          @click="handleMesaClick"
        />
      </div>

      <!-- Empty state -->
      <div v-if="mesas.length === 0" class="mesas-empty">
        <i class="pi pi-table"></i>
        <p>No hay mesas configuradas</p>
        <span v-if="isAdmin">Ve al panel de administración para crearlas</span>
      </div>
    </main>
  </div>
</template>

<style scoped lang="scss" src="./MesasView.scss"></style>
