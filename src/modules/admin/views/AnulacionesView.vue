<script setup lang="ts">
import { ref } from "vue";
import { useToast } from "primevue/usetoast";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Dialog from "primevue/dialog";
import { adminApi, type ComprobanteEmitidoAdmin } from "@/modules/admin/api/adminApi";
import { authApi } from "@/modules/auth/api/authApi";
import { useAuthStore, normalizeAuthRole } from "@/modules/auth/store/authStore";
import { decodeJwtPayload } from "@/shared/auth/jwt";
import { reportesApi } from "@/modules/admin/api/reportesApi";
import {
  downloadComprobantePdf,
  openComprobantePdf,
  toPdfComprobanteData,
} from "@/shared/utils/comprobantePdf";
import { onlyDigits, password, required, username } from "@/shared/validation/inputValidation";
import { getApiErrorMessage } from "@/shared/api/apiError";

const toast = useToast();
const auth = useAuthStore();
const items = ref<ComprobanteEmitidoAdmin[]>([]);
const loading = ref(false);
const anulando = ref(false);
const searched = ref(false);
const numeroBusqueda = ref("");
const motivo = ref<Record<number, string>>({});
const credDialog = ref(false);
const selected = ref<ComprobanteEmitidoAdmin | null>(null);
const credenciales = ref({ usuario: "", contrasena: "" });

async function buscar() {
  const numero = Number(onlyDigits(numeroBusqueda.value));
  if (!numero) {
    toast.add({ severity: "warn", summary: "Ingresa un numero valido", life: 2500 });
    return;
  }

  loading.value = true;
  searched.value = true;
  try {
    items.value = (await adminApi.buscarComprobantesEmitidos(numero)).data.data;
  } catch (error) {
    toast.add({
      severity: "error",
      summary: "Error al cargar comprobantes",
      detail: getApiErrorMessage(
        error,
        "No se pudieron cargar los comprobantes.",
      ),
      life: 3000,
    });
  } finally {
    loading.value = false;
  }
}

function solicitarAnulacion(item: ComprobanteEmitidoAdmin) {
  selected.value = item;
  credenciales.value = { usuario: "", contrasena: "" };
  credDialog.value = true;
}

async function anular() {
  if (!selected.value) return;
  const validationError =
    required(motivo.value[selected.value.id], "Motivo") ||
    username(credenciales.value.usuario) ||
    password(credenciales.value.contrasena, "Contrasena");
  if (validationError) {
    toast.add({ severity: "warn", summary: "Validacion requerida", detail: validationError, life: 3000 });
    return;
  }

  anulando.value = true;
  try {
    const loginRes = await authApi.login({
      usuario: credenciales.value.usuario.trim(),
      contrasena: credenciales.value.contrasena,
    });
    const loginData = loginRes.data.data;
    const rol = normalizeAuthRole(loginData.rol);
    const userId = Number(decodeJwtPayload(loginData.accessToken)?.sub ?? NaN);
    if (rol !== "AD" || auth.rol !== "AD" || userId !== auth.userId) {
      throw new Error("Las credenciales no corresponden al administrador actual");
    }

    await adminApi.anularComprobante(selected.value.id, motivo.value[selected.value.id], {
      usuario: credenciales.value.usuario.trim(),
      contrasena: credenciales.value.contrasena,
    });
    credDialog.value = false;
    toast.add({ severity: "success", summary: "Comprobante anulado", life: 2500 });
    await buscar();
  } catch (error) {
    toast.add({
      severity: "error",
      summary: "Error al anular",
      detail: getApiErrorMessage(
        error,
        "No se pudo anular el comprobante.",
      ),
      life: 3000,
    });
  } finally {
    anulando.value = false;
  }
}

async function obtenerPdf(id: number) {
  const detalle = (await reportesApi.getHistorialDetalle(id)).data.data;
  return toPdfComprobanteData(detalle);
}

async function verPdf(item: ComprobanteEmitidoAdmin) {
  try {
    openComprobantePdf(await obtenerPdf(item.id));
  } catch (error) {
    toast.add({
      severity: "error",
      summary: "PDF no disponible",
      detail: getApiErrorMessage(
        error,
        "No se pudo generar la vista previa del comprobante.",
      ),
      life: 3000,
    });
  }
}

async function descargarPdf(item: ComprobanteEmitidoAdmin) {
  try {
    downloadComprobantePdf(await obtenerPdf(item.id));
    toast.add({
      severity: "success",
      summary: "PDF descargado",
      life: 2500,
    });
  } catch (error) {
    toast.add({
      severity: "error",
      summary: "PDF no disponible",
      detail: getApiErrorMessage(
        error,
        "No se pudo descargar el comprobante.",
      ),
      life: 3000,
    });
  }
}

function fmtSol(n: number) {
  return `S/ ${Number(n ?? 0).toFixed(2)}`;
}
</script>

<template>
  <div class="section-page">
    <div class="section-header">
      <div>
        <h1 class="section-title"><i class="pi pi-times-circle"></i> Anulaciones</h1>
        <p class="section-sub">Busca un comprobante por numero antes de anularlo</p>
      </div>
      <div class="search-row">
        <InputText
          v-model="numeroBusqueda"
          placeholder="Numero de comprobante"
          fluid
          @keyup.enter="buscar"
        />
        <Button label="Buscar" icon="pi pi-search" size="small" :loading="loading" @click="buscar" />
      </div>
    </div>

    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Comprobante</th>
            <th>Pedido</th>
            <th>Metodo</th>
            <th>Total</th>
            <th>PDF</th>
            <th>Motivo validado</th>
            <th>Accion</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading"><td colspan="7" class="empty-cell">Buscando...</td></tr>
          <tr v-else-if="!searched"><td colspan="7" class="empty-cell">Ingresa un numero de comprobante para buscar</td></tr>
          <tr v-else-if="items.length === 0"><td colspan="7" class="empty-cell">No se encontraron comprobantes con ese numero</td></tr>
          <tr v-for="c in items" :key="c.id">
            <td>{{ c.tipoComprobante }} {{ c.serie }}-{{ String(c.numero).padStart(8, "0") }}</td>
            <td>P-{{ c.pedidoId }}</td>
            <td>{{ c.metodoPago }}</td>
            <td class="mono">{{ fmtSol(c.total) }}</td>
            <td>
              <div class="pdf-actions">
                <Button
                  icon="pi pi-eye"
                  text
                  rounded
                  size="small"
                  v-tooltip.top="'Ver PDF'"
                  @click="verPdf(c)"
                />
                <Button
                  icon="pi pi-download"
                  text
                  rounded
                  size="small"
                  v-tooltip.top="'Descargar PDF'"
                  @click="descargarPdf(c)"
                />
              </div>
            </td>
            <td><InputText v-model="motivo[c.id]" placeholder="Motivo de anulacion" fluid /></td>
            <td>
              <Button
                label="Anular"
                icon="pi pi-check"
                severity="danger"
                size="small"
                :disabled="c.estado !== 'COMPLETADO'"
                v-tooltip.top="c.estado !== 'COMPLETADO' ? `Estado no permitido: ${c.estado}` : 'Anular comprobante'"
                @click="solicitarAnulacion(c)"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Dialog v-model:visible="credDialog" header="Confirmar anulacion" modal :style="{ width: '28rem', maxWidth: '95vw' }">
      <div class="dialog-body">
        <p class="dialog-copy">
          Para anular el comprobante, valida las credenciales del administrador actual.
        </p>
        <div class="field-stack">
          <label>Usuario administrador</label>
          <InputText v-model="credenciales.usuario" placeholder="Tu usuario" fluid />
        </div>
        <div class="field-stack">
          <label>Contrasena</label>
          <InputText v-model="credenciales.contrasena" type="password" placeholder="Tu contrasena" fluid />
        </div>
      </div>
      <template #footer>
        <Button label="Cancelar" text :disabled="anulando" @click="credDialog = false" />
        <Button label="Confirmar anulacion" severity="danger" icon="pi pi-lock" :loading="anulando" @click="anular" />
      </template>
    </Dialog>
  </div>
</template>

<style lang="scss" scoped>
.section-page { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem; }
.section-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 0.75rem; }
.section-title { font-family: $font-heading; font-size: 1.1rem; font-weight: 700; color: $c-red; margin: 0; }
.section-title i { margin-right: 0.4rem; }
.section-sub { font-size: 0.75rem; color: $text-muted; margin: 0.15rem 0 0; }
.search-row { display: flex; align-items: center; gap: 0.75rem; min-width: min(30rem, 100%); }
.table-wrap { background: $bg-card; border: 1px solid $border-subtle; border-radius: $r-md; overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
.data-table th { background: $bg-surface; padding: 0.6rem 0.9rem; text-align: left; font-size: 0.68rem; color: $text-muted; text-transform: uppercase; }
.data-table td { padding: 0.6rem 0.9rem; border-top: 1px solid $border-subtle; color: $text-primary; }
.mono { font-family: $font-mono; font-weight: 700; }
.pdf-actions { display: flex; align-items: center; }
.empty-cell { text-align: center; color: $text-dim; padding: 2rem !important; }
.dialog-body { display: flex; flex-direction: column; gap: 0.85rem; }
.dialog-copy { margin: 0; color: $text-muted; font-size: 0.8rem; line-height: 1.45; }
.field-stack { display: flex; flex-direction: column; gap: 0.35rem; }
.field-stack label { color: $text-muted; font-size: 0.76rem; font-weight: 600; }

@media (max-width: 720px) {
  .search-row { width: 100%; flex-direction: column; align-items: stretch; }
}
</style>
