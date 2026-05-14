<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useToast } from "primevue/usetoast";
import Toast from "primevue/toast";
import Dialog from "primevue/dialog";
import InputNumber from "primevue/inputnumber";
import InputText from "primevue/inputtext";
import Button from "primevue/button";
import { reportesApi, type Arqueo } from "@/modules/admin/api/reportesApi";
import { useAuthStore } from "@/modules/auth/store/authStore";
import {
  cleanText,
  maxLength,
  money,
} from "@/shared/validation/inputValidation";

const toast = useToast();
const auth = useAuthStore();

const arqueos = ref<Arqueo[]>([]);
const activo = ref<Arqueo | null>(null);
const loading = ref(false);
const saving = ref(false);

const abrirDialog = ref(false);
const cerrarDialog = ref(false);

const abrirForm = ref({ montoApertura: 0, notas: "" });
const cerrarForm = ref({ montoCierre: 0, notas: "" });

async function cargar() {
  loading.value = true;
  try {
    const [resLista, resActivo] = await Promise.allSettled([
      reportesApi.listarArqueos(),
      reportesApi.getActivo(),
    ]);
    arqueos.value =
      resLista.status === "fulfilled" ? resLista.value.data.data : [];
    activo.value =
      resActivo.status === "fulfilled" ? resActivo.value.data.data : null;
  } catch {
    toast.add({
      severity: "error",
      summary: "Error al cargar arqueos",
      life: 3000,
    });
  } finally {
    loading.value = false;
  }
}

async function handleAbrir() {
  const cajeroId = auth.userId;
  const validationError =
    money(abrirForm.value.montoApertura, "Monto de apertura") ??
    maxLength(abrirForm.value.notas, "Notas", 180);
  if (validationError) {
    toast.add({
      severity: "warn",
      summary: "Revisa la apertura",
      detail: validationError,
      life: 3000,
    });
    return;
  }
  if (cajeroId === null) {
    toast.add({
      severity: "warn",
      summary: "No se pudo identificar el cajero",
      life: 3000,
    });
    return;
  }
  saving.value = true;
  try {
    await reportesApi.abrirArqueo(
      cajeroId,
      Number(abrirForm.value.montoApertura),
      cleanText(abrirForm.value.notas) || undefined,
    );
    toast.add({ severity: "success", summary: "Caja abierta", life: 2500 });
    abrirDialog.value = false;
    abrirForm.value = { montoApertura: 0, notas: "" };
    await cargar();
  } catch {
    toast.add({
      severity: "error",
      summary: "Error al abrir caja",
      life: 3000,
    });
  } finally {
    saving.value = false;
  }
}

async function handleCerrar() {
  if (!activo.value) return;
  const validationError =
    money(cerrarForm.value.montoCierre, "Monto de cierre") ??
    maxLength(cerrarForm.value.notas, "Notas", 180);
  if (validationError) {
    toast.add({
      severity: "warn",
      summary: "Revisa el cierre",
      detail: validationError,
      life: 3000,
    });
    return;
  }
  saving.value = true;
  try {
    await reportesApi.cerrarArqueo(
      activo.value.id,
      Number(cerrarForm.value.montoCierre),
      cleanText(cerrarForm.value.notas) || undefined,
    );
    toast.add({ severity: "success", summary: "Caja cerrada", life: 2500 });
    cerrarDialog.value = false;
    cerrarForm.value = { montoCierre: 0, notas: "" };
    await cargar();
  } catch {
    toast.add({
      severity: "error",
      summary: "Error al cerrar caja",
      life: 3000,
    });
  } finally {
    saving.value = false;
  }
}

function formatFecha(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMonto(n: number | null) {
  if (n === null) return "—";
  return `S/ ${Number(n).toFixed(2)}`;
}

onMounted(cargar);
</script>

<template>
  <div class="section-page">
    <Toast />

    <!-- Header -->
    <div class="section-header">
      <div>
        <h1 class="section-title">
          <i class="pi pi-calculator"></i> Arqueo de Caja
        </h1>
        <p class="section-sub">Gestión de apertura y cierre de caja</p>
      </div>
    </div>

    <!-- Card estado activo -->
    <div class="arqueo-status-card">
      <div class="status-row">
        <span class="status-label">Estado actual</span>
        <span v-if="activo" class="arqueo-badge open">ABIERTO</span>
        <span v-else class="arqueo-badge closed">CERRADO</span>
      </div>

      <template v-if="activo">
        <div class="status-detail-grid">
          <div class="detail-item">
            <span class="detail-label">Apertura</span>
            <span class="detail-value">{{
              formatFecha(activo.aperturaEn)
            }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Monto Apertura</span>
            <span class="detail-value">{{
              formatMonto(activo.montoApertura)
            }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Cajero</span>
            <span class="detail-value">{{ activo.nombreCajero ?? "—" }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Ventas acumuladas</span>
            <span class="detail-value highlight">{{
              formatMonto(activo.totalVentas)
            }}</span>
          </div>
        </div>
        <div class="status-actions">
          <Button
            label="Cerrar Caja"
            icon="pi pi-lock"
            severity="danger"
            size="small"
            @click="cerrarDialog = true"
          />
        </div>
      </template>

      <template v-else>
        <p class="status-desc">No hay una caja abierta actualmente.</p>
        <div class="status-actions">
          <Button
            label="Abrir Caja"
            icon="pi pi-lock-open"
            size="small"
            @click="abrirDialog = true"
          />
        </div>
      </template>
    </div>

    <!-- Historial -->
    <h2 class="history-title">Historial de arqueos</h2>
    <div class="table-wrap">
      <table class="arqueo-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Cajero</th>
            <th>Apertura</th>
            <th>Cierre</th>
            <th>Monto apertura</th>
            <th>Monto cierre</th>
            <th>Total ventas</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="8" class="table-empty">
              <i class="pi pi-spinner pi-spin"></i> Cargando…
            </td>
          </tr>
          <tr v-else-if="arqueos.length === 0">
            <td colspan="8" class="table-empty">Sin registros</td>
          </tr>
          <tr v-for="a in arqueos" :key="a.id">
            <td>{{ a.id }}</td>
            <td>{{ a.nombreCajero ?? "—" }}</td>
            <td>{{ formatFecha(a.aperturaEn) }}</td>
            <td>{{ formatFecha(a.cierreEn) }}</td>
            <td>{{ formatMonto(a.montoApertura) }}</td>
            <td>{{ formatMonto(a.montoCierre) }}</td>
            <td>{{ formatMonto(a.totalVentas) }}</td>
            <td>
              <span
                class="arqueo-badge"
                :class="a.estado === 'ABIERTO' ? 'open' : 'closed'"
              >
                {{ a.estado }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Dialog Abrir Caja -->
    <Dialog
      v-model:visible="abrirDialog"
      header="Abrir Caja"
      :modal="true"
      :style="{ width: '360px' }"
    >
      <div class="form-grid">
        <label class="form-label">Monto de apertura (S/)</label>
        <InputNumber
          v-model="abrirForm.montoApertura"
          :min="0"
          :minFractionDigits="2"
          fluid
        />

        <label class="form-label">Notas (opcional)</label>
        <InputText
          v-model="abrirForm.notas"
          placeholder="Observaciones…"
          fluid
        />
      </div>

      <template #footer>
        <Button
          label="Cancelar"
          text
          @click="abrirDialog = false"
          :disabled="saving"
        />
        <Button
          label="Abrir Caja"
          icon="pi pi-lock-open"
          @click="handleAbrir"
          :loading="saving"
        />
      </template>
    </Dialog>

    <!-- Dialog Cerrar Caja -->
    <Dialog
      v-model:visible="cerrarDialog"
      header="Cerrar Caja"
      :modal="true"
      :style="{ width: '360px' }"
    >
      <div class="form-grid">
        <label class="form-label">Monto de cierre (S/)</label>
        <InputNumber
          v-model="cerrarForm.montoCierre"
          :min="0"
          :minFractionDigits="2"
          fluid
        />

        <label class="form-label">Notas (opcional)</label>
        <InputText
          v-model="cerrarForm.notas"
          placeholder="Observaciones…"
          fluid
        />
      </div>

      <template #footer>
        <Button
          label="Cancelar"
          text
          @click="cerrarDialog = false"
          :disabled="saving"
        />
        <Button
          label="Cerrar Caja"
          icon="pi pi-lock"
          severity="danger"
          @click="handleCerrar"
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
    color: $c-green;
  }
}

.section-sub {
  font-size: 0.75rem;
  color: $text-muted;
  margin: 0.15rem 0 0;
}

.arqueo-status-card {
  background: $bg-card;
  border: 1px solid $border-subtle;
  border-radius: $r-md;
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.status-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.status-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: $text-muted;
}

.status-desc {
  font-size: 0.82rem;
  color: $text-muted;
  margin: 0;
}

.arqueo-badge {
  font-size: 0.68rem;
  font-weight: 700;
  padding: 0.2rem 0.55rem;
  border-radius: $r-full;

  &.open {
    background: $c-green-bg;
    color: $c-green;
  }

  &.closed {
    background: $bg-surface;
    color: $text-dim;
  }
}

.status-detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 0.75rem;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.detail-label {
  font-size: 0.7rem;
  color: $text-dim;
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: 0.03em;
}

.detail-value {
  font-size: 0.88rem;
  color: $text-primary;
  font-weight: 500;

  &.highlight {
    color: $c-green;
    font-weight: 700;
  }
}

.status-actions {
  display: flex;
  gap: 0.5rem;
}

.history-title {
  font-family: $font-heading;
  font-size: 0.8rem;
  font-weight: 700;
  color: $text-dim;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin: 0;
}

.table-wrap {
  background: $bg-card;
  border: 1px solid $border-subtle;
  border-radius: $r-md;
  overflow: hidden;
}

.arqueo-table {
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

.table-empty {
  text-align: center;
  color: $text-dim;
  padding: 1.5rem 0 !important;
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
</style>
