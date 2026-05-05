<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useToast } from "primevue/usetoast";
import Toast from "primevue/toast";
import {
  adminApi,
  type ProductoAdmin,
  type CategoriaAdmin,
} from "@/modules/admin/api/adminApi";
import ProductosTable from "@/modules/admin/components/ProductosTable.vue";

const toast = useToast();

const productos = ref<ProductoAdmin[]>([]);
const categorias = ref<CategoriaAdmin[]>([]);
const loading = ref(false);

interface CategoriaOpcion {
  id: number;
  nombre: string;
}

const categoriasOpciones = computed<CategoriaOpcion[]>(() =>
  categorias.value
    .filter((c) => c.activo)
    .map((c) => ({ id: c.id, nombre: c.nombre })),
);

const disponibles = computed(
  () => productos.value.filter((p) => p.disponible).length,
);

async function cargar() {
  loading.value = true;
  try {
    const [resP, resC] = await Promise.all([
      adminApi.listarProductos(),
      adminApi.listarCategorias(),
    ]);
    productos.value = resP.data.data;
    categorias.value = resC.data.data;
  } catch {
    toast.add({
      severity: "error",
      summary: "Error al cargar productos",
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
        <h1 class="section-title">
          <i class="pi pi-shopping-cart"></i> Productos
        </h1>
        <p class="section-sub">
          <span class="count-highlight">{{ disponibles }}</span> disponibles /
          {{ productos.length }} total
        </p>
      </div>
    </div>

    <div v-if="categorias.length === 0 && !loading" class="info-box">
      <i class="pi pi-info-circle"></i>
      Primero crea categorías en la sección <strong>Categorías</strong> para
      poder agregar productos.
    </div>

    <ProductosTable
      v-else
      :productos="productos"
      :categorias="categoriasOpciones"
      @reload="cargar"
    />
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
    color: $c-green;
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

.info-box {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: $bg-card;
  border: 1px solid $border-medium;
  border-radius: $r-md;
  padding: 0.85rem 1rem;
  font-size: 0.82rem;
  color: $text-muted;

  i {
    color: $amber-dark;
    font-size: 0.9rem;
    flex-shrink: 0;
  }

  strong {
    color: $text-primary;
  }
}
</style>
