<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useToast } from "primevue/usetoast";
import { useConfirm } from "primevue/useconfirm";
import Toast from "primevue/toast";
import ConfirmDialog from "primevue/confirmdialog";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Textarea from "primevue/textarea";
import {
  adminApi,
  type CategoriaAdmin,
  type GuardarCategoriaRequest,
  type ProductoAdmin,
} from "@/modules/admin/api/adminApi";

const toast = useToast();
const confirm = useConfirm();

const categorias = ref<CategoriaAdmin[]>([]);
const productos = ref<ProductoAdmin[]>([]);
const loading = ref(false);
const dialog = ref(false);
const esEdicion = ref(false);
const saving = ref(false);
const editId = ref(0);
const form = ref<GuardarCategoriaRequest>({ nombre: "", descripcion: "" });

function productosPorCategoria(catId: number): number {
  return productos.value.filter((p) => p.categoriaId === catId).length;
}

async function cargar() {
  loading.value = true;
  try {
    const [resC, resP] = await Promise.all([
      adminApi.listarCategorias(),
      adminApi.listarProductos(),
    ]);
    categorias.value = resC.data.data;
    productos.value = resP.data.data;
  } catch {
    toast.add({
      severity: "error",
      summary: "Error al cargar categorías",
      life: 3000,
    });
  } finally {
    loading.value = false;
  }
}

function abrirCrear() {
  form.value = { nombre: "", descripcion: "" };
  esEdicion.value = false;
  dialog.value = true;
}

function abrirEditar(c: CategoriaAdmin) {
  editId.value = c.id;
  form.value = { nombre: c.nombre, descripcion: c.descripcion ?? "" };
  esEdicion.value = true;
  dialog.value = true;
}

async function guardar() {
  if (!form.value.nombre.trim()) {
    toast.add({
      severity: "warn",
      summary: "El nombre es requerido",
      life: 2500,
    });
    return;
  }
  saving.value = true;
  try {
    if (esEdicion.value) {
      await adminApi.actualizarCategoria(editId.value, form.value);
    } else {
      await adminApi.crearCategoria(form.value);
    }
    toast.add({
      severity: "success",
      summary: esEdicion.value ? "Categoría actualizada" : "Categoría creada",
      life: 2500,
    });
    dialog.value = false;
    await cargar();
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } };
    toast.add({
      severity: "error",
      summary: "Error",
      detail: err.response?.data?.message ?? "No se pudo guardar",
      life: 3000,
    });
  } finally {
    saving.value = false;
  }
}

function confirmarEliminar(c: CategoriaAdmin) {
  confirm.require({
    message: `¿Eliminar la categoría "${c.nombre}"? Los productos asociados quedarán sin categoría.`,
    header: "Confirmar eliminación",
    icon: "pi pi-exclamation-triangle",
    rejectProps: { label: "Cancelar", severity: "secondary", outlined: true },
    acceptProps: { label: "Eliminar", severity: "danger" },
    accept: async () => {
      try {
        await adminApi.eliminarCategoria(c.id);
        toast.add({
          severity: "success",
          summary: "Categoría eliminada",
          life: 2500,
        });
        await cargar();
      } catch {
        toast.add({
          severity: "error",
          summary: "Error al eliminar",
          life: 3000,
        });
      }
    },
  });
}

onMounted(cargar);
</script>

<template>
  <div class="section-page">
    <Toast />
    <ConfirmDialog />

    <div class="section-header">
      <div>
        <h1 class="section-title"><i class="pi pi-tags"></i> Categorías</h1>
        <p class="section-sub">Organiza los productos del menú por categoría</p>
      </div>
      <Button
        label="Nueva categoría"
        icon="pi pi-plus"
        size="small"
        @click="abrirCrear"
      />
    </div>

    <div v-if="loading" class="cat-empty">Cargando…</div>

    <div v-else-if="categorias.length === 0" class="cat-empty">
      No hay categorías. Crea la primera para organizar el menú.
    </div>

    <div v-else class="cat-grid">
      <div v-for="c in categorias" :key="c.id" class="cat-card">
        <div class="cat-icon"><i class="pi pi-tag"></i></div>
        <span class="cat-nombre">{{ c.nombre }}</span>
        <span class="cat-desc">{{ c.descripcion ?? "—" }}</span>
        <span class="cat-count"
          >{{ productosPorCategoria(c.id) }} productos</span
        >
        <div class="cat-actions">
          <button class="cat-btn" title="Editar" @click="abrirEditar(c)">
            <i class="pi pi-pencil"></i>
          </button>
          <button
            class="cat-btn cat-btn--danger"
            title="Eliminar"
            @click="confirmarEliminar(c)"
          >
            <i class="pi pi-trash"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Dialog crear / editar -->
    <Dialog
      v-model:visible="dialog"
      :header="esEdicion ? 'Editar categoría' : 'Nueva categoría'"
      modal
      :style="{ width: '22rem' }"
    >
      <div class="form-field">
        <label>Nombre</label>
        <InputText v-model="form.nombre" placeholder="Ej. Entradas" fluid />
      </div>
      <div class="form-field" style="margin-top: 0.75rem">
        <label>Descripción</label>
        <Textarea
          v-model="form.descripcion"
          placeholder="Descripción opcional"
          rows="3"
          fluid
        />
      </div>
      <template #footer>
        <Button
          label="Cancelar"
          severity="secondary"
          outlined
          size="small"
          @click="dialog = false"
        />
        <Button
          :label="esEdicion ? 'Guardar' : 'Crear'"
          icon="pi pi-check"
          size="small"
          :loading="saving"
          @click="guardar"
        />
      </template>
    </Dialog>
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

.cat-empty {
  font-size: 0.82rem;
  color: $text-dim;
  padding: 2rem 0;
  text-align: center;
}

.cat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.85rem;
}

.cat-card {
  background: $bg-card;
  border: 1px solid $border-subtle;
  border-radius: $r-md;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.cat-icon {
  width: 36px;
  height: 36px;
  background: $amber-bg;
  border-radius: $r-sm;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $amber-dark;
  font-size: 0.9rem;
}

.cat-nombre {
  font-weight: 700;
  font-size: 0.88rem;
  color: $text-primary;
}

.cat-desc {
  font-size: 0.75rem;
  color: $text-muted;
}

.cat-count {
  font-size: 0.72rem;
  color: $text-dim;
  margin-top: auto;
}

.cat-actions {
  display: flex;
  gap: 0.35rem;
  margin-top: 0.5rem;
}

.cat-btn {
  width: 28px;
  height: 28px;
  border-radius: $r-sm;
  border: 1px solid $border-subtle;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.72rem;
  transition: all 0.15s;
  color: $text-muted;

  &:hover {
    background: $bg-surface;
    color: $text-primary;
  }

  &--danger:hover {
    background: $c-red-bg;
    border-color: $c-red;
    color: $c-red;
  }
}

.form-field {
  label {
    display: block;
    font-size: 0.78rem;
    color: $text-muted;
    margin-bottom: 0.3rem;
  }
}
</style>
