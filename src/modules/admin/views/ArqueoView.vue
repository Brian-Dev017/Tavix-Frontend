<script setup lang="ts">
import { computed, ref, onMounted } from "vue";
import { useToast } from "primevue/usetoast";
import Dialog from "primevue/dialog";
import InputNumber from "primevue/inputnumber";
import InputText from "primevue/inputtext";
import Button from "primevue/button";
import { reportesApi, type Arqueo } from "@/modules/admin/api/reportesApi";
import {
  cleanText,
  maxLength,
  money,
} from "@/shared/validation/inputValidation";
import { getApiErrorMessage } from "@/shared/api/apiError";
import { moneyInputProps } from "@/shared/forms/moneyInput";
import {
  downloadBlob,
  filenameFromDisposition,
} from "@/shared/utils/fileDownload";
import { toLocalDateInput } from "@/shared/utils/date";

const toast = useToast();

const arqueos = ref<Arqueo[]>([]);
const activo = ref<Arqueo | null>(null);
const loading = ref(false);
const saving = ref(false);
const exportando = ref(false);

const cerrarDialog = ref(false);
const cierreSeleccionado = ref<Arqueo | null>(null);
const cerrarForm = ref({ montoCierre: 0, notas: "" });

const precierresPendientes = computed(() =>
  arqueos.value.filter((arqueo) => arqueo.estado === "PRECIERRE"),
);

function mostrarAperturaNoPermitida() {
  toast.add({
    severity: "error",
    summary: "Apertura no permitida",
    detail: "El administrador no puede abrir caja",
    life: 3000,
  });
}

async function cargar() {
  loading.value = true;
  try {
    const [resLista, resActivo] = await Promise.allSettled([
      reportesApi.listarArqueos(),
      reportesApi.getActivo(),
    ]);
    if (resLista.status === "rejected") throw resLista.reason;
    arqueos.value = resLista.value.data.data;
    activo.value =
      resActivo.status === "fulfilled" ? resActivo.value.data.data : null;
  } catch (error) {
    toast.add({
      severity: "error",
      summary: "Error al cargar arqueos",
      detail: getApiErrorMessage(
        error,
        "No se pudo cargar el historial de arqueos.",
      ),
      life: 3000,
    });
  } finally {
    loading.value = false;
  }
}

function solicitarCierre(arqueo: Arqueo) {
  if (arqueo.estado !== "PRECIERRE") {
    toast.add({
      severity: "warn",
      summary: "Cierre no disponible",
      detail: "El cajero todavía no ha realizado el pre-cierre.",
      life: 3000,
    });
    return;
  }
  cierreSeleccionado.value = arqueo;
  cerrarForm.value = {
    montoCierre: Number(arqueo.montoCierre ?? arqueo.montoEsperado ?? 0),
    notas: arqueo.notas ?? "",
  };
  cerrarDialog.value = true;
}

function cancelarCierre() {
  cerrarDialog.value = false;
  cierreSeleccionado.value = null;
  cerrarForm.value = { montoCierre: 0, notas: "" };
}

async function handleCerrar() {
  if (!cierreSeleccionado.value) return;
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
      cierreSeleccionado.value.id,
      Number(cerrarForm.value.montoCierre),
      cleanText(cerrarForm.value.notas) || undefined,
    );
    toast.add({ severity: "success", summary: "Caja cerrada", life: 2500 });
    cancelarCierre();
    await cargar();
  } catch (error) {
    toast.add({
      severity: "error",
      summary: "Error al cerrar caja",
      detail: getApiErrorMessage(error, "No se pudo cerrar la caja."),
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

async function exportarExcel() {
  if (!arqueos.value.length) return;
  exportando.value = true;
  try {
    const response = await reportesApi.exportArqueosExcel();
    downloadBlob(
      response.data,
      filenameFromDisposition(
        response.headers["content-disposition"],
        `arqueos-${toLocalDateInput()}.xlsx`,
      ),
    );
    toast.add({
      severity: "success",
      summary: "Reporte exportado",
      detail: "Los arqueos se descargaron con resumen, tabla y gráficos.",
      life: 2500,
    });
  } catch (error) {
    toast.add({
      severity: "error",
      summary: "No se pudo exportar arqueos",
      detail: getApiErrorMessage(
        error,
        "No se pudo generar el archivo Excel de arqueos.",
      ),
      life: 3000,
    });
  } finally {
    exportando.value = false;
  }
}

onMounted(cargar);
</script>

<template>
  <div class="section-page">

    <!-- Header -->
    <div class="section-header">
      <div>
        <h1 class="section-title">
          <i class="pi pi-calculator"></i> Arqueo de Caja
        </h1>
        <p class="section-sub">Gestión de apertura y cierre de caja</p>
      </div>
      <Button
        label="Exportar Excel"
        icon="pi pi-download"
        severity="secondary"
        size="small"
        :disabled="arqueos.length === 0"
        :loading="exportando"
        @click="exportarExcel"
      />
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
          <div class="detail-item">
            <span class="detail-label">Redondeo acumulado</span>
            <span class="detail-value">{{ formatMonto(activo.totalRedondeo) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Esperado en caja</span>
            <span class="detail-value highlight">{{
              formatMonto((activo.montoApertura ?? 0) + (activo.totalEfectivo ?? 0))
            }}</span>
          </div>
        </div>
        <div class="status-actions">
          <Button
            label="Esperando pre-cierre del cajero"
            icon="pi pi-clock"
            severity="secondary"
            size="small"
            disabled
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
            @click="mostrarAperturaNoPermitida"
          />
        </div>
      </template>
    </div>

    <div v-if="precierresPendientes.length" class="precierre-panel">
      <div>
        <h2 class="history-title">Pre-cierres pendientes</h2>
        <p class="status-desc">
          {{ precierresPendientes.length }}
          {{ precierresPendientes.length === 1 ? "cajero realizó" : "cajeros realizaron" }}
          el pre-cierre y esperan revisión administrativa.
        </p>
      </div>
      <div class="precierre-list">
        <div
          v-for="arqueo in precierresPendientes"
          :key="arqueo.id"
          class="precierre-item"
        >
          <div>
            <strong>{{ arqueo.nombreCajero ?? `Cajero #${arqueo.cajeroId}` }}</strong>
            <span>
              Apertura {{ formatFecha(arqueo.aperturaEn) }} ·
              Efectivo declarado {{ formatMonto(arqueo.montoCierre) }}
            </span>
          </div>
          <Button
            label="Revisar y cerrar"
            icon="pi pi-check-circle"
            severity="danger"
            size="small"
            @click="solicitarCierre(arqueo)"
          />
        </div>
      </div>
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
            <th>Redondeo</th>
            <th>Esperado</th>
            <th>Diferencia</th>
            <th>Estado</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="12" class="table-empty">
              <i class="pi pi-spinner pi-spin"></i> Cargando…
            </td>
          </tr>
          <tr v-else-if="arqueos.length === 0">
            <td colspan="12" class="table-empty">Sin registros</td>
          </tr>
          <tr v-for="a in arqueos" :key="a.id">
            <td>{{ a.id }}</td>
            <td>{{ a.nombreCajero ?? "—" }}</td>
            <td>{{ formatFecha(a.aperturaEn) }}</td>
            <td>{{ formatFecha(a.cierreEn) }}</td>
            <td>{{ formatMonto(a.montoApertura) }}</td>
            <td>{{ formatMonto(a.montoCierre) }}</td>
            <td>{{ formatMonto(a.totalVentas) }}</td>
            <td>{{ formatMonto(a.totalRedondeo) }}</td>
            <td>{{ formatMonto(a.montoEsperado) }}</td>
            <td>{{ formatMonto(a.diferencia) }}</td>
            <td>
              <span
                class="arqueo-badge"
                :class="{
                  open: a.estado === 'ABIERTO',
                  pending: a.estado === 'PRECIERRE',
                  closed: a.estado === 'CERRADO',
                }"
              >
                {{ a.estado }}
              </span>
            </td>
            <td>
              <Button
                v-if="a.estado === 'PRECIERRE'"
                label="Cerrar"
                icon="pi pi-lock"
                severity="danger"
                size="small"
                text
                @click="solicitarCierre(a)"
              />
              <span v-else class="table-action-empty">—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Dialog Cerrar Caja -->
    <Dialog
      v-model:visible="cerrarDialog"
      :header="`Cerrar caja de ${cierreSeleccionado?.nombreCajero ?? 'cajero'}`"
      :modal="true"
      :style="{ width: '360px' }"
      @hide="cancelarCierre"
    >
      <div class="form-grid">
        <label class="form-label">Monto de cierre (S/)</label>
        <InputNumber
          v-model="cerrarForm.montoCierre"
          v-bind="moneyInputProps"
          :min="0"
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
          @click="cancelarCierre"
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

  &.pending {
    background: $amber-bg;
    color: $amber-dark;
  }

  &.closed {
    background: $bg-surface;
    color: $text-dim;
  }
}

.precierre-panel {
  background: $amber-bg-sm;
  border: 1px solid $amber-glow;
  border-radius: $r-md;
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.precierre-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.precierre-item {
  background: $bg-card;
  border: 1px solid $border-subtle;
  border-radius: $r-sm;
  padding: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;

  div {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  strong {
    color: $text-primary;
    font-size: 0.82rem;
  }

  span {
    color: $text-muted;
    font-size: 0.72rem;
  }
}

.table-action-empty {
  color: $text-dim;
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
  overflow-x: auto;
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
