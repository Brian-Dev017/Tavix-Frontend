<script setup lang="ts">
import { computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "@/modules/auth/store/authStore";
import { useRol } from "@/shared/composables/useRol";

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const { rolMeta, nombreCompleto } = useRol();

function handleLogout() {
  auth.logout();
  router.push("/login");
}

function isActive(path: string) {
  return (
    route.path === `/admin/${path}` || route.path.startsWith(`/admin/${path}/`)
  );
}

const today = computed(() => {
  return new Date().toLocaleDateString("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
});

const navSections = [
  {
    label: "CARTA & MENÚ",
    items: [
      { label: "Productos", path: "productos", icon: "pi-shopping-cart" },
      { label: "Categorías", path: "categorias", icon: "pi-tags" },
    ],
  },
  {
    label: "OPERACIONES",
    items: [
      { label: "Mesas", path: "mesas", icon: "pi-table" },
      { label: "Usuarios", path: "usuarios", icon: "pi-users" },
    ],
  },
  {
    label: "FACTURACIÓN",
    items: [
      { label: "Caja", path: "caja", icon: "pi-calculator" },
      { label: "Pagos", path: "pagos", icon: "pi-credit-card" },
      { label: "Anulaciones", path: "anulaciones", icon: "pi-times-circle" },
      { label: "IGV & Series", path: "igv-series", icon: "pi-percentage" },
    ],
  },
  {
    label: "SUMINISTROS",
    items: [
      { label: "Stock", path: "stock", icon: "pi-box" },
      { label: "Proveedores", path: "proveedores", icon: "pi-truck" },
    ],
  },
  {
    label: "REPORTES",
    items: [
      { label: "Ventas", path: "ventas", icon: "pi-chart-bar" },
      { label: "Historial", path: "historial", icon: "pi-history" },
    ],
  },
  {
    label: "CONFIGURACIÓN",
    items: [
      { label: "Negocio", path: "negocio", icon: "pi-building" },
      { label: "Impresoras", path: "impresoras", icon: "pi-print" },
    ],
  },
];
</script>

<template>
  <div class="admin-shell">
    <!-- ─── Sidebar ──────────────────────────────────── -->
    <aside class="admin-sidebar">
      <!-- Logo -->
      <div class="sidebar-header">
        <div class="sidebar-logo">
          <div class="logo-icon"><i class="pi pi-shield"></i></div>
          <div class="logo-text">
            <div class="logo-name">La Flor del Tumbo</div>
            <div class="logo-sub">Management &amp; POS</div>
          </div>
        </div>
        <div class="sidebar-date">{{ today }}</div>
      </div>

      <!-- Dashboard link -->
      <nav class="sidebar-nav">
        <RouterLink
          to="/admin/dashboard"
          class="nav-item nav-item-dashboard"
          :class="{ active: isActive('dashboard') }"
        >
          <i class="pi pi-home nav-icon"></i>
          <span>Dashboard</span>
        </RouterLink>

        <!-- Section groups -->
        <template v-for="section in navSections" :key="section.label">
          <div class="nav-group-label">{{ section.label }}</div>
          <RouterLink
            v-for="item in section.items"
            :key="item.path"
            :to="`/admin/${item.path}`"
            class="nav-item"
            :class="{ active: isActive(item.path) }"
          >
            <i :class="`pi ${item.icon} nav-icon`"></i>
            <span>{{ item.label }}</span>
          </RouterLink>
        </template>
      </nav>

      <!-- User / Logout -->
      <div class="sidebar-footer">
        <div class="sidebar-user">
          <div class="user-avatar">
            {{ (auth.user?.nombre ?? "A")[0].toUpperCase() }}
          </div>
          <div class="user-info">
            <div class="user-name">{{ nombreCompleto }}</div>
            <div class="user-role" :style="{ color: rolMeta?.color }">
              {{ rolMeta?.label }}
            </div>
          </div>
        </div>
        <button
          class="sidebar-logout"
          @click="handleLogout"
          title="Cerrar sesión"
        >
          <i class="pi pi-sign-out"></i>
        </button>
      </div>
    </aside>

    <!-- ─── Content area ─────────────────────────────── -->
    <main class="admin-content">
      <RouterView />
    </main>
  </div>
</template>

<style lang="scss" src="./AdminLayout.scss" scoped />
