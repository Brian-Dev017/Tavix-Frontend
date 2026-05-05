<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useToast } from "primevue/usetoast";
import Toast from "primevue/toast";
import { adminApi, type UsuarioAdmin } from "@/modules/admin/api/adminApi";
import UsuariosTable from "@/modules/admin/components/UsuariosTable.vue";

const toast = useToast();

const usuarios = ref<UsuarioAdmin[]>([]);
const loading = ref(false);

const activos = computed(() => usuarios.value.filter((u) => u.activo).length);

async function cargar() {
  loading.value = true;
  try {
    const res = await adminApi.listarUsuarios();
    usuarios.value = res.data.data;
  } catch {
    toast.add({
      severity: "error",
      summary: "Error al cargar usuarios",
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

    <div class="section-header">
      <div>
        <h1 class="section-title"><i class="pi pi-users"></i> Usuarios</h1>
        <p class="section-sub">
          <span class="count-highlight">{{ activos }}</span> activos /
          {{ usuarios.length }} total
        </p>
      </div>
    </div>

    <UsuariosTable :usuarios="usuarios" :loading="loading" @reload="cargar" />
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

.count-highlight {
  font-weight: 700;
  color: $c-green;
}
</style>
