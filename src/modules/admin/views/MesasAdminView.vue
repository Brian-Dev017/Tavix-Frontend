<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useToast } from "primevue/usetoast";
import { useConfirm } from "primevue/useconfirm";
import Toast from "primevue/toast";
import ConfirmDialog from "primevue/confirmdialog";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import InputNumber from "primevue/inputnumber";
import {
  adminApi,
  type MesaAdmin,
  type GuardarMesaRequest,
} from "@/modules/admin/api/adminApi";

const toast = useToast();
const confirm = useConfirm();

const mesas = ref<MesaAdmin[]>([]);
const loading = ref(false);
const dialog = ref(false);
const esEdicion = ref(false);
const saving = ref(false);
const editId = ref(0);
const form = ref<GuardarMesaRequest>({ numero: "", capacidad: 2 });

const ESTADO_STYLE: Record<
  MesaAdmin["estado"],
  { label: string; cls: string }
> = {
  DISPONIBLE: { label: "Disponible", cls: "badge--green" },
  OCUPADA: { label: "Ocupada", cls: "badge--red" },
  RESERVADA: { label: "Reservada", cls: "badge--amber" },
  INACTIVA: { label: "Inactiva", cls: "badge--gray" },
};

async function cargar() {
  loading.value = true;
  try {
    const res = await adminApi.listarMesasAdmin();
    mesas.value = res.data.data;
  } catch {
    toast.add({
      severity: "error",
      summary: "Error al cargar mesas",
      life: 3000,
    });
  } finally {
    loading.value = false;
  }
}

function abrirCrear() {
  form.value = { numero: "", capacidad: 2 };
  esEdicion.value = false;
  dialog.value = true;
}

function abrirEditar(m: MesaAdmin) {
  editId.value = m.id;
  form.value = { numero: m.numero, capacidad: m.capacidad };
  esEdicion.value = true;
  dialog.value = true;
}

async function guardar() {
  if (!form.value.numero.trim()) {
    toast.add({
      severity: "warn",
      summary: "El número de mesa es requerido",
      life: 2500,
    });
    return;
  }
  if (form.value.capacidad < 1) {
    toast.add({ severity: "warn", summary: "Capacidad mínima: 1", life: 2500 });
    return;
  }
  saving.value = true;
  try {
    if (esEdicion.value) {
      await adminApi.actualizarMesa(editId.value, form.value);
    } else {
      await adminApi.crearMesa(form.value);
    }
    toast.add({
      severity: "success",
      summary: esEdicion.value ? "Mesa actualizada" : "Mesa creada",
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

async function toggleMesa(m: MesaAdmin) {
  try {
    await adminApi.toggleEstadoMesa(m.id);
    await cargar();
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } };
    toast.add({
      severity: "error",
      summary: "Error",
      detail: err.response?.data?.message ?? "No se pudo cambiar el estado",
      life: 3000,
    });
  }
}

function confirmarEliminar(m: MesaAdmin) {
  confirm.require({
    message: `¿Eliminar la mesa "${m.numero}"? Esta acción es irreversible.`,
    header: "Confirmar eliminación",
    icon: "pi pi-exclamation-triangle",
    rejectProps: { label: "Cancelar", severity: "secondary", outlined: true },
    acceptProps: { label: "Eliminar", severity: "danger" },
    accept: async () => {
      try {
        await adminApi.eliminarMesa(m.id);
        toast.add({
          severity: "success",
          summary: "Mesa eliminada",
          life: 2500,
        });
        await cargar();
      } catch (e: unknown) {
        const err = e as { response?: { data?: { message?: string } } };
        toast.add({
          severity: "error",
          summary: "Error",
          detail: err.response?.data?.message ?? "No se pudo eliminar",
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
        <h1 class="section-title"><i class="pi pi-table"></i> Mesas</h1>
        <p class="section-sub">Administra las mesas del restaurante</p>
      </div>
      <Button
        label="Nueva mesa"
        icon="pi pi-plus"
        size="small"
        @click="abrirCrear"
      />
    </div>

    <div v-if="loading" class="mesa-empty">Cargando…</div>

    <div v-else-if="mesas.length === 0" class="mesa-empty">
      No hay mesas configuradas. Crea la primera.
    </div>

    <div v-else class="mesa-grid">
      <div v-for="m in mesas" :key="m.id" class="mesa-card">
        <span class="mesa-num">{{ m.numero }}</span>
        <span :class="['mesa-estado-badge', ESTADO_STYLE[m.estado].cls]">
          {{ ESTADO_STYLE[m.estado].label }}
        </span>
        <span class="mesa-cap"
          ><i class="pi pi-user"></i> {{ m.capacidad }} personas</span
        >
        <div class="mesa-actions">
          <button class="mesa-btn" title="Editar" @click="abrirEditar(m)">
            <i class="pi pi-pencil"></i>
          </button>
          <button
            class="mesa-btn"
            title="Cambiar estado"
            @click="toggleMesa(m)"
          >
            <i class="pi pi-refresh"></i>
          </button>
          <button
            class="mesa-btn mesa-btn--danger"
            title="Eliminar"
            @click="confirmarEliminar(m)"
          >
            <i class="pi pi-trash"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Dialog crear / editar -->
    <Dialog
      v-model:visible="dialog"
      :header="esEdicion ? 'Editar mesa' : 'Nueva mesa'"
      modal
      :style="{ width: '20rem' }"
    >
      <div class="form-field">
        <label>Número / identificador</label>
        <InputText v-model="form.numero" placeholder="Ej. 1, A1, VIP" fluid />
      </div>
      <div class="form-field" style="margin-top: 0.75rem">
        <label>Capacidad (personas)</label>
        <InputNumber v-model="form.capacidad" :min="1" :max="50" fluid />
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

.mesa-empty {
  font-size: 0.82rem;
  color: $text-dim;
  padding: 2rem 0;
  text-align: center;
}

.mesa-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 0.85rem;
}

.mesa-card {
  background: $bg-card;
  border: 1px solid $border-subtle;
  border-radius: $r-md;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  text-align: center;
}

.mesa-num {
  font-size: 1.5rem;
  font-weight: 700;
  color: $text-primary;
  line-height: 1;
}

.mesa-estado-badge {
  border-radius: $r-full;
  padding: 0.15rem 0.6rem;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;

  &--green {
    background: rgba(34, 197, 94, 0.12);
    color: $c-green;
    border: 1px solid rgba(34, 197, 94, 0.25);
  }

  &--red {
    background: $c-red-bg;
    color: $c-red;
    border: 1px solid rgba(239, 68, 68, 0.25);
  }

  &--amber {
    background: $amber-bg;
    color: $amber-dark;
    border: 1px solid rgba(217, 119, 6, 0.25);
  }

  &--gray {
    background: $bg-surface;
    color: $text-dim;
    border: 1px solid $border-subtle;
  }
}

.mesa-cap {
  font-size: 0.72rem;
  color: $text-muted;

  i {
    font-size: 0.65rem;
    margin-right: 0.2rem;
  }
}

.mesa-actions {
  display: flex;
  gap: 0.35rem;
  margin-top: 0.25rem;
}

.mesa-btn {
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
