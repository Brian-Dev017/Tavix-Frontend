<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useToast } from "primevue/usetoast";
import { useConfirm } from "primevue/useconfirm";
import Toast from "primevue/toast";
import ConfirmDialog from "primevue/confirmdialog";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import InputNumber from "primevue/inputnumber";
import Select from "primevue/select";
import ToggleSwitch from "primevue/toggleswitch";
import Button from "primevue/button";
import {
  configuracionApi,
  type SerieComprobante,
  type NegocioConfig,
} from "@/modules/admin/api/configuracionApi";
import {
  cleanText,
  firstError,
  numberRange,
  oneOf,
  required,
} from "@/shared/validation/inputValidation";

const toast = useToast();
const confirm = useConfirm();

const series = ref<SerieComprobante[]>([]);
const negocio = ref<NegocioConfig | null>(null);
const loading = ref(false);
const saving = ref(false);
const dialog = ref(false);
const esEdit = ref(false);
const editId = ref<number | null>(null);

const TIPOS = [
  { label: "Boleta (B)", value: "B" },
  { label: "Factura (F)", value: "F" },
  { label: "Ticket (T)", value: "T" },
];

const igvEdit = ref(false);
const igvVal = ref(18);

const form = ref<{
  tipo: "B" | "F" | "T";
  serie: string;
  correlativoActual: number;
  activo: boolean;
}>({
  tipo: "B",
  serie: "",
  correlativoActual: 1,
  activo: true,
});

async function cargar() {
  loading.value = true;
  try {
    const [resSeries, resNeg] = await Promise.all([
      configuracionApi.listarSeries(),
      configuracionApi.getNegocio(),
    ]);
    series.value = resSeries.data.data;
    negocio.value = resNeg.data.data;
    igvVal.value = resNeg.data.data.igvPorcentaje ?? 18;
  } catch {
    toast.add({ severity: "error", summary: "Error al cargar", life: 3000 });
  } finally {
    loading.value = false;
  }
}

function abrirCrear() {
  esEdit.value = false;
  editId.value = null;
  form.value = { tipo: "B", serie: "", correlativoActual: 1, activo: true };
  dialog.value = true;
}

function abrirEditar(s: SerieComprobante) {
  esEdit.value = true;
  editId.value = s.id;
  form.value = {
    tipo: s.tipo,
    serie: s.serie,
    correlativoActual: s.correlativoActual,
    activo: s.activo,
  };
  dialog.value = true;
}

async function guardar() {
  const serie = cleanText(form.value.serie).toUpperCase();
  const validationError = firstError([
    oneOf(
      form.value.tipo,
      TIPOS.map((t) => t.value),
      "Tipo",
    ),
    required(serie, "Serie"),
    !new RegExp(`^${form.value.tipo}\\d{3}$`).test(serie) &&
      `Serie debe tener el formato ${form.value.tipo}001`,
    numberRange(form.value.correlativoActual, "Correlativo", 1, 999999999),
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
    const payload = {
      ...form.value,
      serie,
      correlativoActual: Number(form.value.correlativoActual),
    };
    if (esEdit.value && editId.value !== null) {
      await configuracionApi.actualizarSerie(editId.value, payload);
      toast.add({
        severity: "success",
        summary: "Serie actualizada",
        life: 2500,
      });
    } else {
      await configuracionApi.crearSerie(
        payload as Omit<SerieComprobante, "id">,
      );
      toast.add({ severity: "success", summary: "Serie creada", life: 2500 });
    }
    dialog.value = false;
    await cargar();
  } catch {
    toast.add({ severity: "error", summary: "Error al guardar", life: 3000 });
  } finally {
    saving.value = false;
  }
}

function confirmarEliminar(s: SerieComprobante) {
  confirm.require({
    message: `¿Eliminar la serie "${s.serie}" (${s.tipo})?`,
    header: "Confirmar eliminación",
    icon: "pi pi-trash",
    rejectProps: { label: "Cancelar", severity: "secondary", outlined: true },
    acceptProps: { label: "Eliminar", severity: "danger" },
    accept: async () => {
      try {
        await configuracionApi.eliminarSerie(s.id);
        toast.add({
          severity: "success",
          summary: "Serie eliminada",
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

async function guardarIgv() {
  const validationError = numberRange(igvVal.value, "IGV", 0, 100);
  if (validationError) {
    toast.add({
      severity: "warn",
      summary: "Revisa el IGV",
      detail: validationError,
      life: 3000,
    });
    return;
  }
  saving.value = true;
  try {
    await configuracionApi.updateNegocio({ igvPorcentaje: igvVal.value });
    toast.add({ severity: "success", summary: "IGV actualizado", life: 2500 });
    igvEdit.value = false;
    await cargar();
  } catch {
    toast.add({
      severity: "error",
      summary: "Error al guardar IGV",
      life: 3000,
    });
  } finally {
    saving.value = false;
  }
}

function tipoLabel(t: string) {
  return t === "B" ? "Boleta" : t === "F" ? "Factura" : "Ticket";
}

onMounted(cargar);
</script>

<template>
  <div class="section-page">
    <Toast />
    <ConfirmDialog />

    <!-- IGV Card -->
    <div class="igv-card">
      <div class="igv-left">
        <i class="pi pi-percentage igv-icon"></i>
        <div>
          <div class="igv-label">IGV Configurado</div>
          <div class="igv-val">{{ negocio?.igvPorcentaje ?? 18 }}%</div>
        </div>
      </div>
      <div class="igv-right" v-if="!igvEdit">
        <Button
          label="Editar IGV"
          icon="pi pi-pencil"
          size="small"
          outlined
          @click="igvEdit = true"
        />
      </div>
      <div class="igv-right" v-else>
        <InputNumber
          v-model="igvVal"
          :min="0"
          :max="100"
          suffix="%"
          size="small"
          style="width: 90px"
        />
        <Button
          label="Guardar"
          icon="pi pi-check"
          size="small"
          :loading="saving"
          @click="guardarIgv"
        />
        <Button
          label="Cancelar"
          severity="secondary"
          outlined
          size="small"
          @click="igvEdit = false"
        />
      </div>
    </div>

    <!-- Series header -->
    <div class="section-header">
      <div>
        <h1 class="section-title">
          <i class="pi pi-file-text"></i> Series de Comprobantes
        </h1>
        <p class="section-sub">{{ series.length }} serie(s) configurada(s)</p>
      </div>
      <Button
        label="Nueva serie"
        icon="pi pi-plus"
        size="small"
        @click="abrirCrear"
      />
    </div>

    <div v-if="loading" class="empty-state">
      <i class="pi pi-spinner pi-spin"></i> Cargando…
    </div>

    <div v-else-if="series.length === 0" class="empty-state">
      Sin series configuradas. Crea al menos una para emitir comprobantes.
    </div>

    <div v-else class="series-grid">
      <div
        v-for="s in series"
        :key="s.id"
        class="serie-card"
        :class="{ inactive: !s.activo }"
      >
        <div class="serie-tipo" :class="`tipo-${s.tipo.toLowerCase()}`">
          {{ tipoLabel(s.tipo) }}
        </div>
        <div class="serie-num">{{ s.serie }}</div>
        <div class="serie-corr">
          Correlativo: <span>{{ s.correlativoActual }}</span>
        </div>
        <div class="serie-estado">
          <span class="dot" :class="s.activo ? 'dot-on' : 'dot-off'"></span>
          {{ s.activo ? "Activo" : "Inactivo" }}
        </div>
        <div class="serie-actions">
          <button class="act-btn" title="Editar" @click="abrirEditar(s)">
            <i class="pi pi-pencil"></i>
          </button>
          <button
            class="act-btn act-btn--danger"
            title="Eliminar"
            @click="confirmarEliminar(s)"
          >
            <i class="pi pi-trash"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Dialog -->
    <Dialog
      v-model:visible="dialog"
      :header="esEdit ? 'Editar Serie' : 'Nueva Serie'"
      modal
      :style="{ width: '360px' }"
    >
      <div class="form-grid">
        <label class="form-lbl">Tipo *</label>
        <Select
          v-model="form.tipo"
          :options="TIPOS"
          optionLabel="label"
          optionValue="value"
          fluid
        />

        <label class="form-lbl">Serie *</label>
        <InputText v-model="form.serie" placeholder="Ej: B001" fluid />

        <label class="form-lbl">Correlativo inicial</label>
        <InputNumber v-model="form.correlativoActual" :min="1" fluid />

        <label class="form-lbl">Activo</label>
        <ToggleSwitch v-model="form.activo" />
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
          :label="esEdit ? 'Guardar' : 'Crear'"
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
  gap: 1.25rem;
}

.igv-card {
  background: $bg-card;
  border: 1px solid $border-subtle;
  border-radius: $r-md;
  padding: 1rem 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.igv-left {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.igv-icon {
  width: 42px;
  height: 42px;
  background: $violet-bg-sm;
  border: 1px solid rgba(124, 58, 237, 0.2);
  border-radius: $r-md;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  color: $violet;
}

.igv-label {
  font-size: 0.72rem;
  color: $text-muted;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.igv-val {
  font-family: $font-mono;
  font-size: 1.5rem;
  font-weight: 700;
  color: $violet;
}

.igv-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
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

.series-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.85rem;
}

.serie-card {
  background: $bg-card;
  border: 1px solid $border-subtle;
  border-radius: $r-md;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  transition: all 0.15s;

  &.inactive {
    opacity: 0.55;
  }
}

.serie-tipo {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 0.18rem 0.55rem;
  border-radius: $r-full;
  display: inline-block;
  align-self: flex-start;
  &.tipo-b {
    background: $amber-bg;
    color: $amber-dark;
  }
  &.tipo-f {
    background: $violet-bg-sm;
    color: $violet;
  }
  &.tipo-t {
    background: $c-green-bg;
    color: $c-green;
  }
}

.serie-num {
  font-family: $font-mono;
  font-size: 1.1rem;
  font-weight: 700;
  color: $text-primary;
}
.serie-corr {
  font-size: 0.72rem;
  color: $text-muted;
  span {
    font-weight: 600;
    color: $text-primary;
  }
}

.serie-estado {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.72rem;
  color: $text-muted;
}

.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  &-on {
    background: $c-green;
  }
  &-off {
    background: $text-dim;
  }
}

.serie-actions {
  display: flex;
  gap: 0.3rem;
  margin-top: 0.25rem;
}

.act-btn {
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
  color: $text-muted;
  transition: all 0.15s;
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

.form-grid {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.form-lbl {
  font-size: 0.78rem;
  color: $text-muted;
  font-weight: 500;
}

.empty-state {
  text-align: center;
  color: $text-dim;
  font-size: 0.82rem;
  padding: 2rem;
}
</style>
