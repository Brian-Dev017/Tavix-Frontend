<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useToast } from "primevue/usetoast";
import Toast from "primevue/toast";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import { adminApi } from "@/modules/admin/api/adminApi";
import { required } from "@/shared/validation/inputValidation";

const toast = useToast();
const items = ref<Array<{
  id: number
  pedidoId: number
  tipoComprobante: string
  serie: string
  numero: number
  metodoPago: string
  total: number
  estado: string
  pagadoEn: string
}>>([]);
const loading = ref(false);
const motivo = ref<Record<number, string>>({});

async function cargar() {
  loading.value = true;
  try {
    items.value = (await adminApi.listarComprobantesEmitidos()).data.data;
  } catch {
    toast.add({ severity: "error", summary: "Error al cargar comprobantes", life: 3000 });
  } finally {
    loading.value = false;
  }
}

async function anular(id: number) {
  const validationError = required(motivo.value[id], "Motivo");
  if (validationError) {
    toast.add({ severity: "warn", summary: "Validación requerida", detail: validationError, life: 3000 });
    return;
  }
  try {
    await adminApi.anularComprobante(id, motivo.value[id]);
    toast.add({ severity: "success", summary: "Comprobante anulado", life: 2500 });
    await cargar();
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } };
    toast.add({ severity: "error", summary: "Error al anular", detail: err.response?.data?.message, life: 3000 });
  }
}

function fmtSol(n: number) {
  return `S/ ${Number(n ?? 0).toFixed(2)}`;
}

onMounted(cargar);
</script>

<template>
  <div class="section-page">
    <Toast />
    <div class="section-header">
      <div>
        <h1 class="section-title"><i class="pi pi-times-circle"></i> Anulaciones</h1>
        <p class="section-sub">Boletas y facturas emitidas pendientes de validación</p>
      </div>
      <Button label="Actualizar" icon="pi pi-refresh" size="small" :loading="loading" @click="cargar" />
    </div>

    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Comprobante</th>
            <th>Pedido</th>
            <th>Método</th>
            <th>Total</th>
            <th>Motivo validado</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading"><td colspan="6" class="empty-cell">Cargando...</td></tr>
          <tr v-else-if="items.length === 0"><td colspan="6" class="empty-cell">Sin boletas o facturas emitidas</td></tr>
          <tr v-for="c in items" :key="c.id">
            <td>{{ c.tipoComprobante }} {{ c.serie }}-{{ String(c.numero).padStart(8, "0") }}</td>
            <td>P-{{ c.pedidoId }}</td>
            <td>{{ c.metodoPago }}</td>
            <td class="mono">{{ fmtSol(c.total) }}</td>
            <td><InputText v-model="motivo[c.id]" placeholder="Motivo de anulación" fluid /></td>
            <td><Button label="Anular" icon="pi pi-check" severity="danger" size="small" @click="anular(c.id)" /></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.section-page { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem; }
.section-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 0.75rem; }
.section-title { font-family: $font-heading; font-size: 1.1rem; font-weight: 700; color: $c-red; margin: 0; }
.section-title i { margin-right: 0.4rem; }
.section-sub { font-size: 0.75rem; color: $text-muted; margin: 0.15rem 0 0; }
.table-wrap { background: $bg-card; border: 1px solid $border-subtle; border-radius: $r-md; overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
.data-table th { background: $bg-surface; padding: 0.6rem 0.9rem; text-align: left; font-size: 0.68rem; color: $text-muted; text-transform: uppercase; }
.data-table td { padding: 0.6rem 0.9rem; border-top: 1px solid $border-subtle; color: $text-primary; }
.mono { font-family: $font-mono; font-weight: 700; }
.empty-cell { text-align: center; color: $text-dim; padding: 2rem !important; }
</style>
