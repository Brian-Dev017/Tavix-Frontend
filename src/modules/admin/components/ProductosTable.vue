<script setup lang="ts">
import { ref, computed } from "vue";
import { useToast } from "primevue/usetoast";
import {
  adminApi,
  type ProductoAdmin,
  type GuardarProductoRequest,
} from "@/modules/admin/api/adminApi";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import InputNumber from "primevue/inputnumber";
import Textarea from "primevue/textarea";
import Select from "primevue/select";
import Tag from "primevue/tag";
import ToggleSwitch from "primevue/toggleswitch";
import ConfirmDialog from "primevue/confirmdialog";
import { useConfirm } from "primevue/useconfirm";
import {
  cleanText,
  firstError,
  httpUrl,
  maxLength,
  money,
  nameText,
} from "@/shared/validation/inputValidation";

interface CategoriaOpcion {
  id: number;
  nombre: string;
}

const props = defineProps<{
  productos: ProductoAdmin[];
  categorias: CategoriaOpcion[];
}>();
const emit = defineEmits<{ reload: [] }>();
const toast = useToast();
const confirm = useConfirm();

// ── Dialog crear/editar ──────────────────────────────────────────────────
const dialogVisible = ref(false);
const esEdicion = ref(false);
const saving = ref(false);
const editId = ref(0);

const formVacio = (): GuardarProductoRequest => ({
  categoriaId: 0,
  nombre: "",
  descripcion: "",
  precio: 0,
  imagenUrl: "",
  disponible: true,
});
const form = ref<GuardarProductoRequest>(formVacio());

function abrirCrear() {
  form.value = formVacio();
  esEdicion.value = false;
  dialogVisible.value = true;
}

function abrirEditar(p: ProductoAdmin) {
  editId.value = p.id;
  form.value = {
    categoriaId: p.categoriaId,
    nombre: p.nombre,
    descripcion: p.descripcion ?? "",
    precio: p.precio,
    imagenUrl: p.imagenUrl ?? "",
    disponible: p.disponible,
  };
  esEdicion.value = true;
  dialogVisible.value = true;
}

async function guardar() {
  const categoriaExiste = props.categorias.some(
    (c) => c.id === form.value.categoriaId,
  );
  const validationError = firstError([
    nameText(form.value.nombre, "Nombre"),
    !categoriaExiste && "Selecciona una categoría válida",
    money(form.value.precio, "Precio"),
    Number(form.value.precio) <= 0 && "Precio debe ser mayor a 0",
    maxLength(form.value.descripcion, "Descripción", 250),
    httpUrl(form.value.imagenUrl, "URL de imagen"),
  ]);
  if (validationError) {
    toast.add({
      severity: "warn",
      summary: "Revisa el formulario",
      detail: validationError,
      life: 3000,
    });
    return;
  }
  form.value = {
    ...form.value,
    nombre: cleanText(form.value.nombre),
    descripcion: cleanText(form.value.descripcion),
    imagenUrl: cleanText(form.value.imagenUrl),
    precio: Number(form.value.precio),
  };
  if (!form.value.nombre || !form.value.categoriaId || !form.value.precio) {
    toast.add({
      severity: "warn",
      summary: "Campos requeridos",
      detail: "Nombre, categoría y precio son obligatorios",
      life: 3000,
    });
    return;
  }
  saving.value = true;
  try {
    if (esEdicion.value) {
      await adminApi.actualizarProducto(editId.value, form.value);
    } else {
      await adminApi.crearProducto(form.value);
    }
    toast.add({
      severity: "success",
      summary: esEdicion.value ? "Actualizado" : "Creado",
      detail: "Producto guardado",
      life: 2500,
    });
    dialogVisible.value = false;
    emit("reload");
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

// ── Toggle disponibilidad ────────────────────────────────────────────────
async function toggleDisponible(p: ProductoAdmin) {
  try {
    await adminApi.toggleDisponibilidad(p.id);
    emit("reload");
  } catch {
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "No se pudo actualizar",
      life: 3000,
    });
  }
}

// ── Eliminar ─────────────────────────────────────────────────────────────
function confirmarEliminar(p: ProductoAdmin) {
  confirm.require({
    message: `¿Eliminar "${p.nombre}" permanentemente?`,
    header: "Confirmar eliminación",
    icon: "pi pi-exclamation-triangle",
    rejectProps: { label: "Cancelar", severity: "secondary", outlined: true },
    acceptProps: { label: "Eliminar", severity: "danger" },
    accept: async () => {
      try {
        await adminApi.eliminarProducto(p.id);
        toast.add({ severity: "success", summary: "Eliminado", life: 2500 });
        emit("reload");
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

// ── Búsqueda ─────────────────────────────────────────────────────────────
const busqueda = ref("");
const productosFiltrados = computed(() =>
  props.productos.filter((p) =>
    `${p.nombre} ${p.categoriaNombre}`
      .toLowerCase()
      .includes(busqueda.value.toLowerCase()),
  ),
);

const formatPrecio = (v: number) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(
    v,
  );
</script>

<template>
  <ConfirmDialog />

  <div class="tabla-panel">
    <div class="tabla-toolbar">
      <div class="busqueda-wrap">
        <i class="pi pi-search search-icon"></i>
        <input
          v-model="busqueda"
          placeholder="Buscar producto..."
          class="busqueda-input"
        />
      </div>
      <Button
        label="Nuevo producto"
        icon="pi pi-plus"
        size="small"
        @click="abrirCrear"
      />
    </div>

    <div class="tabla-scroll">
      <table class="admin-tabla">
        <thead>
          <tr>
            <th>Imagen</th>
            <th>Producto</th>
            <th>Categoría</th>
            <th>Precio</th>
            <th>Disponible</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in productosFiltrados" :key="p.id">
            <td class="img-cell">
              <img
                v-if="p.imagenUrl"
                :src="p.imagenUrl"
                :alt="p.nombre"
                class="prod-img"
              />
              <div v-else class="no-img"><i class="pi pi-image"></i></div>
            </td>
            <td>
              <div class="nombre-principal">{{ p.nombre }}</div>
              <div class="descripcion-breve">{{ p.descripcion }}</div>
            </td>
            <td>
              <Tag :value="p.categoriaNombre" severity="info" />
            </td>
            <td class="precio-cell">{{ formatPrecio(p.precio) }}</td>
            <td>
              <div class="estado-cell" @click.stop>
                <ToggleSwitch
                  :modelValue="p.disponible"
                  @update:modelValue="toggleDisponible(p)"
                />
                <span :class="p.disponible ? 'activo-label' : 'inactivo-label'">
                  {{ p.disponible ? "Sí" : "No" }}
                </span>
              </div>
            </td>
            <td>
              <div class="acciones">
                <Button
                  icon="pi pi-pencil"
                  text
                  rounded
                  size="small"
                  @click="abrirEditar(p)"
                  aria-label="Editar"
                />
                <Button
                  icon="pi pi-trash"
                  text
                  rounded
                  size="small"
                  severity="danger"
                  @click="confirmarEliminar(p)"
                  aria-label="Eliminar"
                />
              </div>
            </td>
          </tr>
          <tr v-if="productosFiltrados.length === 0">
            <td colspan="6" class="empty-row">Sin resultados</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Dialog crear/editar -->
    <Dialog
      v-model:visible="dialogVisible"
      :header="esEdicion ? 'Editar producto' : 'Nuevo producto'"
      modal
      :style="{ width: '460px' }"
    >
      <div class="form-grid">
        <div class="form-field">
          <label>Nombre</label>
          <InputText v-model="form.nombre" fluid />
        </div>
        <div class="form-field">
          <label>Categoría</label>
          <Select
            v-model="form.categoriaId"
            :options="categorias"
            optionLabel="nombre"
            optionValue="id"
            fluid
          />
        </div>
        <div class="form-field">
          <label>Descripción</label>
          <Textarea v-model="form.descripcion" rows="2" fluid />
        </div>
        <div class="form-field">
          <label>Precio (S/)</label>
          <InputNumber
            v-model="form.precio"
            :min="0"
            :minFractionDigits="2"
            :maxFractionDigits="2"
            fluid
          />
        </div>
        <div class="form-field">
          <label>URL de imagen</label>
          <InputText v-model="form.imagenUrl" fluid placeholder="https://..." />
        </div>
        <div class="form-field">
          <label>Disponible</label>
          <div class="estado-cell">
            <ToggleSwitch v-model="form.disponible" />
            <span>{{ form.disponible ? "Sí" : "No" }}</span>
          </div>
        </div>
      </div>
      <template #footer>
        <Button
          label="Cancelar"
          severity="secondary"
          outlined
          @click="dialogVisible = false"
        />
        <Button
          :label="esEdicion ? 'Guardar cambios' : 'Crear producto'"
          icon="pi pi-check"
          :loading="saving"
          @click="guardar"
        />
      </template>
    </Dialog>
  </div>
</template>

<style scoped lang="scss">
.tabla-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.tabla-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.busqueda-wrap {
  position: relative;
  flex: 1;
  max-width: 320px;
}
.search-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: $text-muted;
  pointer-events: none;
}
.busqueda-input {
  width: 100%;
  padding: 0.5rem 0.75rem 0.5rem 2.25rem;
  background: $bg-surface;
  border: 1px solid $border-medium;
  border-radius: 0.5rem;
  color: $text-primary;
  font-size: 0.875rem;
  outline: none;
}
.busqueda-input:focus {
  border-color: $amber-dark;
}

.tabla-scroll {
  overflow-x: auto;
}

.admin-tabla {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}
.admin-tabla thead th {
  text-align: left;
  padding: 0.6rem 0.9rem;
  background: $bg-surface;
  color: $text-muted;
  font-weight: 700;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid $border-medium;
}
.admin-tabla tbody td {
  padding: 0.65rem 0.9rem;
  border-bottom: 1px solid $border-subtle;
  color: $text-primary;
  vertical-align: middle;
}
.admin-tabla tbody tr:hover td {
  background: $bg-hover;
}

.img-cell {
  width: 60px;
}
.prod-img {
  width: 48px;
  height: 48px;
  border-radius: 0.4rem;
  object-fit: cover;
}
.no-img {
  width: 48px;
  height: 48px;
  border-radius: 0.4rem;
  background: $bg-surface;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $text-muted;
}

.nombre-principal {
  font-weight: 600;
}
.descripcion-breve {
  font-size: 0.75rem;
  color: $text-muted;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.precio-cell {
  font-weight: 700;
  color: $c-green;
  font-variant-numeric: tabular-nums;
}

.estado-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.activo-label {
  color: $c-green;
  font-size: 0.8rem;
  font-weight: 600;
}
.inactivo-label {
  color: $c-red;
  font-size: 0.8rem;
  font-weight: 600;
}

.acciones {
  display: flex;
  gap: 0.25rem;
}
.empty-row {
  text-align: center;
  color: $text-muted;
  padding: 2rem;
}

.form-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-bottom: 0.5rem;
}
.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.form-field label {
  font-size: 0.8rem;
  color: $text-muted;
  font-weight: 600;
}
</style>
