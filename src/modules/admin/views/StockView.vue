<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useToast } from "primevue/usetoast";
import { useConfirm } from "primevue/useconfirm";
import Toast from "primevue/toast";
import ConfirmDialog from "primevue/confirmdialog";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import InputNumber from "primevue/inputnumber";
import Button from "primevue/button";
import {
  stockApi,
  type Insumo,
  type GuardarInsumoRequest,
} from "@/modules/admin/api/stockApi";

const toast = useToast();
const confirm = useConfirm();

const insumos = ref<Insumo[]>([]);
const loading = ref(false);
const dialog = ref(false);
const esEdicion = ref(false);
const saving = ref(false);
const editId = ref<number | null>(null);
const form = ref<GuardarInsumoRequest>({
  nombre: "",
  unidad: "",
  stockActual: 0,
  stockMinimo: 0,
});

const ajusteDialog = ref(false);
const ajusteId = ref<number | null>(null);
const ajusteValor = ref<number>(0);

const critico = computed(() =>
  insumos.value.filter((i) => i.stockActual <= i.stockMinimo),
);

async function cargar() {
  loading.value = true;
  try {
    const res = await stockApi.listar();
    insumos.value = res.data.data;
  } catch {
    toast.add({
      severity: "error",
      summary: "Error al cargar insumos",
      life: 3000,
    });
  } finally {
    loading.value = false;
  }
}

function abrirCrear() {
  esEdicion.value = false;
  editId.value = null;
  form.value = { nombre: "", unidad: "", stockActual: 0, stockMinimo: 0 };
  dialog.value = true;
}

function abrirEditar(i: Insumo) {
  esEdicion.value = true;
  editId.value = i.id;
  form.value = {
    nombre: i.nombre,
    unidad: i.unidad,
    stockActual: i.stockActual,
    stockMinimo: i.stockMinimo,
  };
  dialog.value = true;
}

async function guardar() {
  if (!form.value.nombre.trim() || !form.value.unidad.trim()) {
    toast.add({
      severity: "warn",
      summary: "Nombre y unidad son requeridos",
      life: 3000,
    });
    return;
  }
  saving.value = true;
  try {
    if (esEdicion.value && editId.value !== null) {
      await stockApi.actualizar(editId.value, form.value);
      toast.add({
        severity: "success",
        summary: "Insumo actualizado",
        life: 2500,
      });
    } else {
      await stockApi.crear(form.value);
      toast.add({ severity: "success", summary: "Insumo creado", life: 2500 });
    }
    dialog.value = false;
    await cargar();
  } catch {
    toast.add({ severity: "error", summary: "Error al guardar", life: 3000 });
  } finally {
    saving.value = false;
  }
}

function abrirAjuste(i: Insumo) {
  ajusteId.value = i.id;
  ajusteValor.value = 0;
  ajusteDialog.value = true;
}

async function guardarAjuste() {
  if (ajusteId.value === null) return;
  saving.value = true;
  try {
    await stockApi.ajustarStock(ajusteId.value, ajusteValor.value);
    toast.add({ severity: "success", summary: "Stock ajustado", life: 2500 });
    ajusteDialog.value = false;
    await cargar();
  } catch {
    toast.add({
      severity: "error",
      summary: "Error al ajustar stock",
      life: 3000,
    });
  } finally {
    saving.value = false;
  }
}

function confirmarEliminar(i: Insumo) {
  confirm.require({
    message: `¿Eliminar el insumo "${i.nombre}"?`,
    header: "Confirmar eliminación",
    icon: "pi pi-trash",
    rejectLabel: "Cancelar",
    acceptLabel: "Eliminar",
    acceptClass: "p-button-danger",
    accept: async () => {
      try {
        await stockApi.eliminar(i.id);
        toast.add({
          severity: "success",
          summary: "Insumo eliminado",
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

const insumoActivo = computed(() =>
  ajusteId.value !== null
    ? insumos.value.find((i) => i.id === ajusteId.value)
    : null,
);

onMounted(cargar);
</script>

<template>
  <div class="section-page">
    <Toast />
    <ConfirmDialog />

    <!-- Header -->
    <div class="section-header">
      <div>
        <h1 class="section-title" style="color: var(--c-yellow, #d97706)">
          <i class="pi pi-box"></i> Stock de Insumos
        </h1>
        <p class="section-sub">{{ insumos.length }} insumos registrados</p>
      </div>
      <Button
        label="Nuevo insumo"
        icon="pi pi-plus"
        size="small"
        @click="abrirCrear"
      />
    </div>

    <!-- Alert banner críticos -->
    <div v-if="critico.length > 0" class="alert-banner">
      <i class="pi pi-exclamation-triangle"></i>
      <span>⚠ {{ critico.length }} insumo(s) con stock bajo o agotado</span>
    </div>

    <!-- Tabla -->
    <div class="table-wrap">
      <table class="stock-table">
        <thead>
          <tr>
            <th>Insumo</th>
            <th>Unidad</th>
            <th>Stock Actual</th>
            <th>Stock Mínimo</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td
              colspan="6"
              style="
                text-align: center;
                color: var(--text-dim);
                padding: 1.5rem 0;
              "
            >
              <i class="pi pi-spinner pi-spin"></i> Cargando…
            </td>
          </tr>
          <tr v-else-if="insumos.length === 0">
            <td
              colspan="6"
              style="
                text-align: center;
                color: var(--text-dim);
                padding: 1.5rem 0;
              "
            >
              Sin insumos registrados
            </td>
          </tr>
          <tr v-for="item in insumos" :key="item.id">
            <td>{{ item.nombre }}</td>
            <td>{{ item.unidad }}</td>
            <td>{{ item.stockActual }}</td>
            <td>{{ item.stockMinimo }}</td>
            <td>
              <span
                class="stock-badge"
                :class="item.stockActual > item.stockMinimo ? 'ok' : 'bajo'"
              >
                {{ item.stockActual > item.stockMinimo ? "OK" : "BAJO" }}
              </span>
            </td>
            <td class="actions-cell">
              <Button
                icon="pi pi-plus-minus"
                size="small"
                class="btn-ajustar"
                text
                @click="abrirAjuste(item)"
                v-tooltip.top="'Ajustar stock'"
              />
              <Button
                icon="pi pi-pencil"
                size="small"
                text
                @click="abrirEditar(item)"
                v-tooltip.top="'Editar'"
              />
              <Button
                icon="pi pi-trash"
                size="small"
                text
                severity="danger"
                @click="confirmarEliminar(item)"
                v-tooltip.top="'Eliminar'"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Dialog Crear/Editar -->
    <Dialog
      v-model:visible="dialog"
      :header="esEdicion ? 'Editar Insumo' : 'Nuevo Insumo'"
      :modal="true"
      :style="{ width: '380px' }"
    >
      <div class="form-grid">
        <label class="form-label">Nombre *</label>
        <InputText v-model="form.nombre" placeholder="Ej: Harina" fluid />

        <label class="form-label">Unidad *</label>
        <InputText v-model="form.unidad" placeholder="Ej: kg" fluid />

        <label class="form-label">Stock Actual</label>
        <InputNumber v-model="form.stockActual" :min="0" fluid />

        <label class="form-label">Stock Mínimo</label>
        <InputNumber v-model="form.stockMinimo" :min="0" fluid />
      </div>

      <template #footer>
        <Button
          label="Cancelar"
          text
          @click="dialog = false"
          :disabled="saving"
        />
        <Button
          :label="esEdicion ? 'Guardar' : 'Crear'"
          icon="pi pi-check"
          @click="guardar"
          :loading="saving"
        />
      </template>
    </Dialog>

    <!-- Dialog Ajustar Stock -->
    <Dialog
      v-model:visible="ajusteDialog"
      header="Ajustar Stock"
      :modal="true"
      :style="{ width: '340px' }"
    >
      <div class="form-grid">
        <p class="ajuste-info" v-if="insumoActivo">
          Stock actual de <strong>{{ insumoActivo.nombre }}</strong
          >:
          <span class="ajuste-current"
            >{{ insumoActivo.stockActual }} {{ insumoActivo.unidad }}</span
          >
        </p>

        <label class="form-label">Ajuste</label>
        <InputNumber v-model="ajusteValor" :step="1" showButtons fluid />
        <p class="form-hint">Positivo suma, negativo resta</p>
      </div>

      <template #footer>
        <Button
          label="Cancelar"
          text
          @click="ajusteDialog = false"
          :disabled="saving"
        />
        <Button
          label="Aplicar"
          icon="pi pi-check"
          @click="guardarAjuste"
          :loading="saving"
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
  gap: 1rem;
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
    color: $c-yellow;
  }
}

.section-sub {
  font-size: 0.75rem;
  color: $text-muted;
  margin: 0.15rem 0 0;
}

.alert-banner {
  background: $c-yellow-bg;
  border: 1px solid rgba(217, 119, 6, 0.25);
  border-radius: $r-sm;
  padding: 0.6rem 1rem;
  font-size: 0.8rem;
  color: $c-yellow;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.table-wrap {
  background: $bg-card;
  border: 1px solid $border-subtle;
  border-radius: $r-md;
  overflow: hidden;
}

.stock-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;

  th {
    padding: 0.6rem 0.9rem;
    background: $bg-surface;
    color: $text-muted;
    font-size: 0.68rem;
    font-weight: 600;
    text-align: left;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid $border-medium;
  }

  td {
    padding: 0.6rem 0.9rem;
    border-bottom: 1px solid $border-subtle;
    color: $text-primary;
    font-size: 0.82rem;
  }

  tr:last-child td {
    border-bottom: none;
  }

  tr:hover td {
    background: $bg-hover;
  }
}

.stock-badge {
  font-size: 0.68rem;
  font-weight: 700;
  padding: 0.15rem 0.5rem;
  border-radius: $r-full;

  &.ok {
    background: $c-green-bg;
    color: $c-green;
  }

  &.bajo {
    background: $c-red-bg;
    color: $c-red;
  }
}

.actions-cell {
  display: flex;
  gap: 0.15rem;
  align-items: center;
}

.btn-ajustar {
  color: $amber !important;
}

.form-grid {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.form-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: $text-muted;
}

.form-hint {
  font-size: 0.72rem;
  color: $text-dim;
  margin: 0;
}

.ajuste-info {
  font-size: 0.82rem;
  color: $text-muted;
  margin: 0;
  padding: 0.5rem 0.75rem;
  background: $bg-surface;
  border-radius: $r-sm;
}

.ajuste-current {
  font-weight: 700;
  color: $text-primary;
  margin-left: 0.25rem;
}
</style>
