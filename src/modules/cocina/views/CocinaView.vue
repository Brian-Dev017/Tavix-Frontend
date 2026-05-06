<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "primevue/usetoast";
import { performLogout } from "@/shared/auth/logout";
import { useAuthStore } from "@/modules/auth/store/authStore";
import { useRol } from "@/shared/composables/useRol";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { cocinaApi, type ColaItem } from "@/modules/cocina/api/cocinaApi";

const router = useRouter();
const toast = useToast();
const auth = useAuthStore();
const { rolMeta, isAdmin, nombreCompleto } = useRol();
const API_BASE_URL = (import.meta.env.VITE_API_URL as string).replace(
  /\/$/,
  "",
);

const cola = ref<ColaItem[]>([]);
const loading = ref(true);
const now = ref(Date.now());
let ticker: ReturnType<typeof setInterval>;
let stompClient: Client | null = null;

async function handleLogout() {
  await performLogout();
  router.push("/login");
}

const pendientes = computed(() =>
  cola.value.filter((i) => i.estado === "PENDIENTE"),
);
const enPreparacion = computed(() =>
  cola.value.filter((i) => i.estado === "EN_PREPARACION"),
);

function tiempoMin(fechaStr: string): number {
  return Math.floor((now.value - new Date(fechaStr).getTime()) / 60000);
}

function formatTiempo(fechaStr: string): string {
  const diff = tiempoMin(fechaStr);
  if (diff < 1) return "ahora";
  if (diff === 1) return "1 min";
  return `${diff} min`;
}

function urgencia(fechaStr: string): string {
  const min = tiempoMin(fechaStr);
  if (min >= 15) return "critico";
  if (min >= 8) return "urgente";
  return "";
}

async function cargarCola() {
  try {
    const res = await cocinaApi.getCola();
    cola.value = res.data.data;
  } catch {
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "No se pudo cargar la cola",
      life: 3000,
    });
  } finally {
    loading.value = false;
  }
}

function conectarWebSocket() {
  if (!auth.accessToken) return;

  stompClient = new Client({
    webSocketFactory: () => new SockJS(`${API_BASE_URL}/ws`),
    connectHeaders: {
      Authorization: `Bearer ${auth.accessToken}`,
    },
    onConnect: () => {
      stompClient?.subscribe("/topic/cocina", (msg) => {
        try {
          const item = JSON.parse(msg.body);
          const existe = cola.value.some((i) => i.detalleId === item.detalleId);
          if (!existe) {
            cola.value.push({
              detalleId: item.detalleId,
              pedidoId: item.pedidoId,
              mesa: item.mesa,
              producto: item.producto,
              cantidad: item.cantidad,
              observaciones: item.observaciones ?? null,
              estado: "PENDIENTE",
              solicitadoEn: item.solicitadoEn,
            });
            toast.add({
              severity: "info",
              summary: `Mesa ${item.mesa}`,
              detail: `${item.cantidad}x ${item.producto}`,
              life: 4000,
            });
          }
        } catch {
          /* ignorar mensajes malformados */
        }
      });
    },
    onWebSocketError: () => {
      toast.add({
        severity: "error",
        summary: "Tiempo real desconectado",
        detail: "No se pudo abrir la conexión de cocina",
        life: 3000,
      });
    },
    onStompError: () => {
      toast.add({
        severity: "error",
        summary: "Acceso WebSocket denegado",
        detail: "La sesión no pudo autenticarse para cocina",
        life: 3000,
      });
    },
  });
  stompClient.activate();
}

async function cambiarEstado(item: ColaItem, nuevoEstado: string) {
  try {
    await cocinaApi.actualizarEstado(item.detalleId, nuevoEstado);
    if (nuevoEstado === "LISTO") {
      cola.value = cola.value.filter((i) => i.detalleId !== item.detalleId);
      toast.add({
        severity: "success",
        summary: "Listo",
        detail: `${item.producto} marcado como listo`,
        life: 2000,
      });
    } else {
      const target = cola.value.find((i) => i.detalleId === item.detalleId);
      if (target) target.estado = nuevoEstado as ColaItem["estado"];
    }
  } catch {
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "No se pudo actualizar el estado",
      life: 3000,
    });
  }
}

onMounted(async () => {
  await cargarCola();
  conectarWebSocket();
  ticker = setInterval(() => {
    now.value = Date.now();
  }, 30000);
});

onUnmounted(() => {
  stompClient?.deactivate();
  clearInterval(ticker);
});
</script>

<template>
  <div class="cocina-page">
    <!-- Header -->
    <header class="page-header">
      <div>
        <h1 class="page-title">
          <i
            class="pi pi-bolt"
            style="color: #d97706; margin-right: 0.4rem; font-size: 1rem"
          ></i>
          Cocina
        </h1>
        <p class="page-subtitle">
          Tiempo real · WebSocket
          <span style="color: var(--border-medium, #d9d3ce)">·</span>
          <span class="page-stat-dot dot-red"></span
          >{{ pendientes.length }} pendientes
          <span style="color: var(--border-medium, #d9d3ce)">·</span>
          <span class="page-stat-dot dot-amber"></span
          >{{ enPreparacion.length }} en preparación
        </p>
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
          class="hdr-btn danger"
          @click="handleLogout"
          title="Cerrar sesión"
        >
          <i class="pi pi-sign-out"></i>
        </button>
      </div>
    </header>

    <!-- Cargando -->
    <div v-if="loading" class="page-loading">
      <div class="page-spinner"></div>
      <span>Cargando cola...</span>
    </div>

    <!-- Kanban board -->
    <div v-else class="cocina-board">
      <!-- PENDIENTES -->
      <div class="kanban-col">
        <div class="col-header col-pendiente">
          <div class="col-icon"><i class="pi pi-stopwatch"></i></div>
          Pendientes
          <span class="col-count">{{ pendientes.length }}</span>
        </div>
        <div class="col-body">
          <div v-if="pendientes.length === 0" class="col-empty">
            <i class="pi pi-check-circle"></i>
            <span>Sin pedidos pendientes</span>
          </div>
          <div
            v-for="item in pendientes"
            :key="item.detalleId"
            class="item-card item-pendiente"
            :class="
              urgencia(item.solicitadoEn)
                ? `item-${urgencia(item.solicitadoEn)}`
                : ''
            "
          >
            <div class="item-top">
              <span class="mesa-tag">Mesa {{ item.mesa }}</span>
              <span
                class="tiempo-tag"
                :class="
                  urgencia(item.solicitadoEn)
                    ? `tiempo-${urgencia(item.solicitadoEn)}`
                    : ''
                "
              >
                <i class="pi pi-stopwatch"></i>
                {{ formatTiempo(item.solicitadoEn) }}
              </span>
            </div>
            <div class="item-nombre">
              {{ item.cantidad }}× {{ item.producto }}
            </div>
            <div v-if="item.observaciones" class="item-obs">
              <i class="pi pi-info-circle"></i>
              {{ item.observaciones }}
            </div>
            <button
              class="item-action action-start"
              @click="cambiarEstado(item, 'EN_PREPARACION')"
            >
              <i class="pi pi-bolt"></i> Iniciar
            </button>
          </div>
        </div>
      </div>

      <!-- EN PREPARACIÓN -->
      <div class="kanban-col">
        <div class="col-header col-preparacion">
          <div class="col-icon"><i class="pi pi-bolt"></i></div>
          En Preparación
          <span class="col-count">{{ enPreparacion.length }}</span>
        </div>
        <div class="col-body">
          <div v-if="enPreparacion.length === 0" class="col-empty">
            <i class="pi pi-sparkles"></i>
            <span>Sin ítems en preparación</span>
          </div>
          <div
            v-for="item in enPreparacion"
            :key="item.detalleId"
            class="item-card item-preparacion"
            :class="
              urgencia(item.solicitadoEn)
                ? `item-${urgencia(item.solicitadoEn)}`
                : ''
            "
          >
            <div class="item-top">
              <span class="mesa-tag">Mesa {{ item.mesa }}</span>
              <span
                class="tiempo-tag"
                :class="
                  urgencia(item.solicitadoEn)
                    ? `tiempo-${urgencia(item.solicitadoEn)}`
                    : ''
                "
              >
                <i class="pi pi-stopwatch"></i>
                {{ formatTiempo(item.solicitadoEn) }}
              </span>
            </div>
            <div class="item-nombre">
              {{ item.cantidad }}× {{ item.producto }}
            </div>
            <div v-if="item.observaciones" class="item-obs">
              <i class="pi pi-info-circle"></i>
              {{ item.observaciones }}
            </div>
            <button
              class="item-action action-done"
              @click="cambiarEstado(item, 'LISTO')"
            >
              <i class="pi pi-check-circle"></i> Listo
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss" src="./CocinaView.scss"></style>
