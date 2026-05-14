<script setup lang="ts">
import { computed, ref, onMounted } from "vue";
import { useToast } from "primevue/usetoast";
import { useConfirm } from "primevue/useconfirm";
import Toast from "primevue/toast";
import ConfirmDialog from "primevue/confirmdialog";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputNumber from "primevue/inputnumber";
import {
  adminApi,
  type MesaAdmin,
  type GuardarMesaRequest,
} from "@/modules/admin/api/adminApi";
import { firstError, required } from "@/shared/validation/inputValidation";

const toast = useToast();
const confirm = useConfirm();

const mesas = ref<MesaAdmin[]>([]);
const loading = ref(false);
const dialog = ref(false);
const esEdicion = ref(false);
const saving = ref(false);
const editId = ref(0);

// Mesa: número entero (null al inicio), Capacidad: null al inicio
const form = ref<{ numero: number | null; capacidad: number | null }>({
  numero: null,
  capacidad: null,
});

// Controla si el usuario ya salió del campo capacidad (blur) para mostrar error
const capacidadTocada = ref(false);

const ESTADO_STYLE: Record<
  MesaAdmin["estado"],
  { label: string; cls: string }
> = {
  DISPONIBLE: { label: "Disponible", cls: "badge--green" },
  OCUPADA: { label: "Ocupada", cls: "badge--red" },
  RESERVADA: { label: "Reservada", cls: "badge--amber" },
  INACTIVA: { label: "Inactiva", cls: "badge--gray" },
};

// Solo se puede editar/eliminar si la mesa está DISPONIBLE o RESERVADA
function puedeEditarEliminar(m: MesaAdmin): boolean {
  return m.estado === "DISPONIBLE" || m.estado === "RESERVADA";
}

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
  form.value = { numero: null, capacidad: null };
  capacidadTocada.value = false;
  esEdicion.value = false;
  dialog.value = true;
}

function abrirEditar(m: MesaAdmin) {
  if (!puedeEditarEliminar(m)) return;
  editId.value = m.id;
  // numero de mesa como entero
  form.value = { numero: Number(m.numero), capacidad: m.capacidad };
  capacidadTocada.value = false;
  esEdicion.value = true;
  dialog.value = true;
}

// ── Validaciones ─────────────────────────────────────────────────────────────

const numeroMesaDuplicado = computed(() => {
  if (form.value.numero === null) return false;
  const numero = String(form.value.numero);
  return mesas.value.some(
    (m) =>
      String(m.numero) === numero &&
      (!esEdicion.value || m.id !== editId.value),
  );
});

const numeroMesaError = computed(() =>
  numeroMesaDuplicado.value
    ? "Ingrese otro número de mesa, esa mesa ya fue creada"
    : "",
);

// Validez real de capacidad (sin depender de si fue tocado, para el botón)
const capacidadEsValida = computed(() => {
  const val = form.value.capacidad;
  if (val === null || val === undefined) return false;
  if (!Number.isInteger(val)) return false;
  if (val < 2 || val > 9) return false;
  return true;
});

// Error de capacidad: solo se muestra después del blur
const capacidadMesaError = computed(() => {
  if (!capacidadTocada.value) return "";
  const val = form.value.capacidad;
  if (val === null || val === undefined) return "La capacidad es requerida";
  if (!Number.isInteger(val)) return "La capacidad debe ser un número entero";
  if (val < 2 || val > 9) return "La capacidad mínima es 2 y máxima 9";
  return "";
});

// Botón habilitado solo cuando el formulario es completamente válido
const formValido = computed(() => {
  if (form.value.numero === null) return false;
  if (numeroMesaError.value) return false;
  if (!capacidadEsValida.value) return false;
  return true;
});

function onCapacidadBlur() {
  // Se activa en cuanto el valor cambia (update:modelValue), no al perder foco
  capacidadTocada.value = true;
}

// ── Guardar ───────────────────────────────────────────────────────────────────

async function guardar() {
  // Forzar validación de capacidad al intentar guardar
  capacidadTocada.value = true;

  const numeroStr =
    form.value.numero !== null ? String(form.value.numero) : "";

  const validationError = firstError([
    required(numeroStr, "Número de mesa"),
    numeroMesaError.value,
    form.value.capacidad === null
      ? "La capacidad es requerida"
      : capacidadMesaError.value,
  ]);

  if (validationError) {
    toast.add({
      severity: "warn",
      summary: "Revisa el formulario",
      detail: validationError,
      life: 2500,
    });
    return;
  }

  const payload: GuardarMesaRequest = {
    numero: numeroStr,
    capacidad: Number(form.value.capacidad),
  };

  saving.value = true;
  try {
    if (esEdicion.value) {
      await adminApi.actualizarMesa(editId.value, payload);
    } else {
      await adminApi.crearMesa(payload);
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

// ── Toggle / Eliminar ─────────────────────────────────────────────────────────

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
  if (!puedeEditarEliminar(m)) return;
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
          <button
            class="mesa-btn"
            title="Editar"
            :disabled="!puedeEditarEliminar(m)"
            :class="{ 'mesa-btn--disabled': !puedeEditarEliminar(m) }"
            @click="abrirEditar(m)"
          >
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
            :disabled="!puedeEditarEliminar(m)"
            :class="{ 'mesa-btn--disabled': !puedeEditarEliminar(m) }"
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
      <!-- Número de mesa: solo enteros -->
      <div class="form-field">
        <label>Número de mesa</label>
        <InputNumber
          v-model="form.numero"
          :useGrouping="false"
          :minFractionDigits="0"
          :maxFractionDigits="0"
          :allowEmpty="true"
          :min="1"
          placeholder="Ej. 1, 2, 3"
          fluid
        />
        <small v-if="numeroMesaError" class="field-error">
          {{ numeroMesaError }}
        </small>
      </div>

      <!-- Capacidad: inicia vacío, error aparece al salir del campo (blur) -->
      <div class="form-field" style="margin-top: 0.75rem">
        <label>Capacidad (personas)</label>
        <InputNumber
          v-model="form.capacidad"
          :useGrouping="false"
          :minFractionDigits="0"
          :maxFractionDigits="0"
          :allowEmpty="true"
          placeholder="Ej. 4"
          fluid
          @update:modelValue="onCapacidadBlur"
        />
        <small v-if="capacidadMesaError" class="field-error">
          {{ capacidadMesaError }}
        </small>
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
          :disabled="!formValido"
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

  &--disabled {
    opacity: 0.35;
    cursor: not-allowed;
    pointer-events: none;
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

.field-error {
  display: block;
  margin-top: 0.3rem;
  color: $c-red;
  font-size: 0.72rem;
  line-height: 1.25;
}
</style>