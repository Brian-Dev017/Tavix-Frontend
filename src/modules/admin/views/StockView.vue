<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useToast } from "primevue/usetoast";
import { useConfirm } from "primevue/useconfirm";

import Toast from "primevue/toast";
import ConfirmDialog from "primevue/confirmdialog";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import InputNumber from "primevue/inputnumber";
import Select from "primevue/select";
import Button from "primevue/button";

import {
  stockApi,
  type Insumo,
  type GuardarInsumoRequest,
} from "@/modules/admin/api/stockApi";

import {
  cleanText,
  firstError,
  nameText,
  numberRange,
  required,
} from "@/shared/validation/inputValidation";

const toast = useToast();
const confirm = useConfirm();

// ─────────────────────────────────────────────────────────────────────────────
// UNIDADES
// ─────────────────────────────────────────────────────────────────────────────
const UNIDADES = [
  { label: "Unidades (und)", value: "und" },
  { label: "Kilogramos (kg)", value: "kg" },
  { label: "Litros (l)", value: "l" },
  { label: "Gramos (g)", value: "g" },
  { label: "Mililitros (ml)", value: "ml" },
  { label: "Porciones (por)", value: "por" },
];

// Solo kg y g permiten decimales
const UNIDADES_DECIMAL = new Set(["kg", "g"]);

const permiteDecimal = computed(() =>
  UNIDADES_DECIMAL.has(form.value.unidad),
);

const fraccionDigitos = computed(() =>
  permiteDecimal.value ? 2 : 0,
);

// ─────────────────────────────────────────────────────────────────────────────
// ESTADO
// ─────────────────────────────────────────────────────────────────────────────
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
  insumos.value.filter(
    (i) => i.stockActual <= i.stockMinimo,
  ),
);

// ─────────────────────────────────────────────────────────────────────────────
// CAMBIO DE UNIDAD
// ─────────────────────────────────────────────────────────────────────────────
function onUnidadChange() {
  // Si la unidad NO permite decimales
  // convertir automáticamente a entero
  if (!permiteDecimal.value) {
    form.value.stockActual = Math.trunc(
      Number(form.value.stockActual),
    );

    form.value.stockMinimo = Math.trunc(
      Number(form.value.stockMinimo),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// API
// ─────────────────────────────────────────────────────────────────────────────
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

  form.value = {
    nombre: "",
    unidad: "",
    stockActual: 0,
    stockMinimo: 0,
  };

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
  const validationError = firstError([
    nameText(form.value.nombre, "Nombre"),

    required(form.value.unidad, "Unidad"),

    numberRange(
      form.value.stockActual,
      "Stock actual",
      0,
      999999,
    ),

    numberRange(
      form.value.stockMinimo,
      "Stock mínimo",
      0,
      999999,
    ),
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

  saving.value = true;

  try {
    const payload: GuardarInsumoRequest = {
      nombre: cleanText(form.value.nombre),

      unidad: form.value.unidad,

      // PrimeVue InputNumber controla 2 decimales
      stockActual: Number(form.value.stockActual),

      stockMinimo: Number(form.value.stockMinimo),
    };

    if (esEdicion.value && editId.value !== null) {
      await stockApi.actualizar(
        editId.value,
        payload,
      );

      toast.add({
        severity: "success",
        summary: "Insumo actualizado",
        life: 2500,
      });
    } else {
      await stockApi.crear(payload);

      toast.add({
        severity: "success",
        summary: "Insumo creado",
        life: 2500,
      });
    }

    dialog.value = false;

    await cargar();
  } catch {
    toast.add({
      severity: "error",
      summary: "Error al guardar",
      life: 3000,
    });
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

  const validationError = numberRange(
    ajusteValor.value,
    "Ajuste",
    -999999,
    999999,
  );

  if (
    validationError ||
    Number(ajusteValor.value) === 0
  ) {
    toast.add({
      severity: "warn",
      summary: "Revisa el ajuste",
      detail:
        validationError ??
        "Ajuste debe ser distinto de 0",
      life: 3000,
    });

    return;
  }

  saving.value = true;

  try {
    await stockApi.ajustarStock(
      ajusteId.value,
      Number(ajusteValor.value),
    );

    toast.add({
      severity: "success",
      summary: "Stock ajustado",
      life: 2500,
    });

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

// ─────────────────────────────────────────────────────────────────────────────
// ELIMINAR
// ─────────────────────────────────────────────────────────────────────────────
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

        // ✅ Eliminar inmediatamente del array reactivo
        insumos.value = insumos.value.filter(
          (item) => item.id !== i.id,
        );

        toast.add({
          severity: "success",
          summary: "Insumo eliminado",
          life: 2500,
        });
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

// ─────────────────────────────────────────────────────────────────────────────
// COMPUTEDS
// ─────────────────────────────────────────────────────────────────────────────
const insumoActivo = computed(() =>
  ajusteId.value !== null
    ? insumos.value.find(
        (i) => i.id === ajusteId.value,
      )
    : null,
);

const ajustePermiteDecimal = computed(() =>
  insumoActivo.value
    ? UNIDADES_DECIMAL.has(
        insumoActivo.value.unidad,
      )
    : false,
);

const ajusteFraccionDigitos = computed(() =>
  ajustePermiteDecimal.value ? 2 : 0,
);

onMounted(cargar);
</script>

<template>
  <div class="section-page">

    <Toast />
    <ConfirmDialog />

    <!-- HEADER -->
    <div class="section-header">

      <div>
        <h1 class="section-title">
          <i class="pi pi-box"></i>
          Stock de Insumos
        </h1>

        <p class="section-sub">
          {{ insumos.length }}
          insumos registrados
        </p>
      </div>

      <Button
        label="Nuevo insumo"
        icon="pi pi-plus"
        size="small"
        @click="abrirCrear"
      />

    </div>

    <!-- ALERTA -->
    <div
      v-if="critico.length > 0"
      class="alert-banner"
    >
      <i class="pi pi-exclamation-triangle"></i>

      <span>
        ⚠ {{ critico.length }}
        insumo(s) con stock bajo o agotado
      </span>
    </div>

    <!-- TABLA -->
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
            <td colspan="6" class="td-center">
              <i class="pi pi-spinner pi-spin"></i>
              Cargando…
            </td>
          </tr>

          <tr v-else-if="insumos.length === 0">
            <td colspan="6" class="td-center">
              Sin insumos registrados
            </td>
          </tr>

          <tr
            v-for="item in insumos"
            :key="item.id"
          >
            <td>{{ item.nombre }}</td>

            <td>{{ item.unidad }}</td>

            <td>{{ item.stockActual }}</td>

            <td>{{ item.stockMinimo }}</td>

            <td>
              <span
                class="stock-badge"
                :class="
                  item.stockActual >
                  item.stockMinimo
                    ? 'ok'
                    : 'bajo'
                "
              >
                {{
                  item.stockActual >
                  item.stockMinimo
                    ? "OK"
                    : "BAJO"
                }}
              </span>
            </td>

            <td class="actions-cell">

              <Button
                icon="pi pi-plus-minus"
                size="small"
                class="btn-ajustar"
                text
                @click="abrirAjuste(item)"
              />

              <Button
                icon="pi pi-pencil"
                size="small"
                text
                @click="abrirEditar(item)"
              />

              <Button
                icon="pi pi-trash"
                size="small"
                text
                severity="danger"
                @click="confirmarEliminar(item)"
              />

            </td>
          </tr>

        </tbody>

      </table>

    </div>

    <!-- DIALOG CREAR / EDITAR -->
    <Dialog
      v-model:visible="dialog"
      :header="
        esEdicion
          ? 'Editar Insumo'
          : 'Nuevo Insumo'
      "
      :modal="true"
      :style="{ width: '380px' }"
    >

      <div class="form-grid">

        <!-- NOMBRE -->
        <div class="form-field">

          <label class="form-label">
            Nombre *
          </label>

          <InputText
            v-model="form.nombre"
            placeholder="Ej: Harina"
            fluid
          />

        </div>

        <!-- UNIDAD -->
        <div class="form-field">

          <label class="form-label">
            Unidad *
          </label>

          <Select
            v-model="form.unidad"
            :options="UNIDADES"
            optionLabel="label"
            optionValue="value"
            placeholder="Selecciona una unidad"
            fluid
            @change="onUnidadChange"
          />

          <small
            v-if="form.unidad"
            class="form-hint"
          >
            {{
              permiteDecimal
                ? "Máximo 2 decimales (ej: 1200.40)"
                : "Solo números enteros"
            }}
          </small>

        </div>

        <!-- STOCK ACTUAL -->
        <div class="form-field">

          <label class="form-label">
            Stock Actual
          </label>

          <InputNumber
            v-model="form.stockActual"
            mode="decimal"
            locale="en-US"
            :min="0"
            :step="
              permiteDecimal ? 0.01 : 1
            "
            :minFractionDigits="0"
            :maxFractionDigits="
              fraccionDigitos
            "
            :useGrouping="false"
            :disabled="!form.unidad"
            fluid
          />

        </div>

        <!-- STOCK MINIMO -->
        <div class="form-field">

          <label class="form-label">
            Stock Mínimo
          </label>

          <InputNumber
            v-model="form.stockMinimo"
            mode="decimal"
            locale="en-US"
            :min="0"
            :step="
              permiteDecimal ? 0.01 : 1
            "
            :minFractionDigits="0"
            :maxFractionDigits="
              fraccionDigitos
            "
            :useGrouping="false"
            :disabled="!form.unidad"
            fluid
          />

        </div>

      </div>

      <template #footer>

        <Button
          label="Cancelar"
          text
          @click="dialog = false"
          :disabled="saving"
        />

        <Button
          :label="
            esEdicion
              ? 'Guardar'
              : 'Crear'
          "
          icon="pi pi-check"
          @click="guardar"
          :loading="saving"
        />

      </template>

    </Dialog>

    <!-- DIALOG AJUSTE -->
    <Dialog
      v-model:visible="ajusteDialog"
      header="Ajustar Stock"
      :modal="true"
      :style="{ width: '340px' }"
    >

      <div class="form-grid">

        <p
          class="ajuste-info"
          v-if="insumoActivo"
        >
          Stock actual de
          <strong>
            {{ insumoActivo.nombre }}
          </strong>:

          <span class="ajuste-current">
            {{ insumoActivo.stockActual }}
            {{ insumoActivo.unidad }}
          </span>
        </p>

        <div class="form-field">

          <label class="form-label">
            Ajuste
          </label>

          <InputNumber
            v-model="ajusteValor"
            mode="decimal"
            locale="en-US"
            :step="
              ajustePermiteDecimal
                ? 0.01
                : 1
            "
            :minFractionDigits="0"
            :maxFractionDigits="
              ajusteFraccionDigitos
            "
            :useGrouping="false"
            showButtons
            fluid
          />

          <p class="form-hint">
            Positivo suma, negativo resta
          </p>

        </div>

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

.td-center {
  text-align: center;
  color: $text-dim;
  padding: 1.5rem 0;
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
  gap: 0.75rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
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

