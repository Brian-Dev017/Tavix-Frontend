<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useToast } from "primevue/usetoast";
import Toast from "primevue/toast";
import InputText from "primevue/inputtext";
import InputNumber from "primevue/inputnumber";
import Button from "primevue/button";
import {
  configuracionApi,
  type NegocioConfig,
} from "@/modules/admin/api/configuracionApi";
import {
  cleanText,
  firstError,
  httpUrl,
  maxLength,
  nameText,
  numberRange,
  onlyDigits,
  ruc,
} from "@/shared/validation/inputValidation";

const toast = useToast();
const loading = ref(false);
const saving = ref(false);

const form = ref<NegocioConfig>({
  id: 1,
  rucNegocio: "",
  nombreComercial: "",
  direccion: "",
  logoUrl: "",
  igvPorcentaje: 18,
});

async function cargar() {
  loading.value = true;
  try {
    const res = await configuracionApi.getNegocio();
    form.value = { ...res.data.data };
  } catch {
    toast.add({
      severity: "error",
      summary: "Error al cargar datos del negocio",
      life: 3000,
    });
  } finally {
    loading.value = false;
  }
}

async function guardar() {
  const validationError = firstError([
    ruc(form.value.rucNegocio),
    nameText(form.value.nombreComercial, "Nombre comercial"),
    maxLength(form.value.direccion, "Dirección", 160),
    httpUrl(form.value.logoUrl, "URL del logo"),
    numberRange(form.value.igvPorcentaje, "IGV", 0, 100),
  ]);
  if (validationError) {
    toast.add({
      severity: "warn",
      summary: "Revisa los datos",
      detail: validationError,
      life: 3000,
    });
    return;
  }
  saving.value = true;
  try {
    await configuracionApi.updateNegocio({
      rucNegocio: onlyDigits(form.value.rucNegocio),
      nombreComercial: cleanText(form.value.nombreComercial),
      direccion: cleanText(form.value.direccion),
      logoUrl: cleanText(form.value.logoUrl),
      igvPorcentaje: Number(form.value.igvPorcentaje),
    });
    toast.add({
      severity: "success",
      summary: "Datos guardados correctamente",
      life: 2500,
    });
  } catch {
    toast.add({ severity: "error", summary: "Error al guardar", life: 3000 });
  } finally {
    saving.value = false;
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
          <i class="pi pi-building"></i> Datos del Negocio
        </h1>
        <p class="section-sub">
          Información que aparece en comprobantes impresos
        </p>
      </div>
    </div>

    <div v-if="loading" class="empty-state">
      <i class="pi pi-spinner pi-spin"></i> Cargando…
    </div>

    <div v-else class="config-card">
      <div class="config-grid">
        <!-- RUC -->
        <div class="field-group">
          <label class="field-lbl">RUC</label>
          <InputText
            v-model="form.rucNegocio"
            placeholder="20XXXXXXXXX"
            :maxlength="11"
            fluid
          />
          <span class="field-hint">11 dígitos sin espacios</span>
        </div>

        <!-- Nombre comercial -->
        <div class="field-group">
          <label class="field-lbl">Nombre Comercial</label>
          <InputText
            v-model="form.nombreComercial"
            placeholder="La Flor del Tumbo"
            fluid
          />
        </div>

        <!-- Dirección -->
        <div class="field-group field-full">
          <label class="field-lbl">Dirección</label>
          <InputText
            v-model="form.direccion"
            placeholder="Jr. Ejemplo 123, Lima"
            fluid
          />
        </div>

        <!-- Logo URL -->
        <div class="field-group field-full">
          <label class="field-lbl">URL del Logo</label>
          <InputText v-model="form.logoUrl" placeholder="https://..." fluid />
          <span class="field-hint"
            >Se muestra en los comprobantes impresos</span
          >
        </div>

        <!-- IGV -->
        <div class="field-group">
          <label class="field-lbl">IGV (%)</label>
          <InputNumber
            v-model="form.igvPorcentaje"
            :min="0"
            :max="100"
            suffix="%"
            fluid
          />
          <span class="field-hint"
            >Impuesto General a las Ventas — normalmente 18%</span
          >
        </div>
      </div>

      <!-- Preview card -->
      <div class="preview-card" v-if="form.nombreComercial">
        <div class="preview-label">Vista previa del encabezado</div>
        <div class="preview-body">
          <img
            v-if="form.logoUrl"
            :src="form.logoUrl"
            class="preview-logo"
            alt="logo"
            @error="($event.target as HTMLImageElement).style.display = 'none'"
          />
          <div class="preview-info">
            <div class="preview-nombre">{{ form.nombreComercial }}</div>
            <div class="preview-line" v-if="form.rucNegocio">
              RUC: {{ form.rucNegocio }}
            </div>
            <div class="preview-line" v-if="form.direccion">
              {{ form.direccion }}
            </div>
            <div class="preview-line">IGV: {{ form.igvPorcentaje }}%</div>
          </div>
        </div>
      </div>

      <div class="actions-row">
        <Button
          label="Guardar cambios"
          icon="pi pi-check"
          :loading="saving"
          @click="guardar"
        />
        <Button
          label="Descartar"
          severity="secondary"
          outlined
          :disabled="saving"
          @click="cargar"
        />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.section-page {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
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

.config-card {
  background: $bg-card;
  border: 1px solid $border-subtle;
  border-radius: $r-lg;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 720px;
}

.config-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  &.field-full {
    grid-column: 1 / -1;
  }
}

.field-lbl {
  font-size: 0.78rem;
  font-weight: 600;
  color: $text-muted;
}

.field-hint {
  font-size: 0.7rem;
  color: $text-dim;
}

.preview-card {
  background: $bg-deep;
  border: 1px dashed $border-medium;
  border-radius: $r-md;
  padding: 1rem;
}

.preview-label {
  font-size: 0.68rem;
  color: $text-dim;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 0.75rem;
}

.preview-body {
  display: flex;
  gap: 0.85rem;
  align-items: flex-start;
}

.preview-logo {
  width: 48px;
  height: 48px;
  object-fit: contain;
  border-radius: $r-sm;
}

.preview-nombre {
  font-family: $font-heading;
  font-weight: 700;
  font-size: 0.92rem;
  color: $text-primary;
}

.preview-line {
  font-size: 0.72rem;
  color: $text-muted;
  margin-top: 0.1rem;
}

.actions-row {
  display: flex;
  gap: 0.75rem;
}

.empty-state {
  text-align: center;
  color: $text-dim;
  font-size: 0.82rem;
  padding: 2rem;
}
</style>
