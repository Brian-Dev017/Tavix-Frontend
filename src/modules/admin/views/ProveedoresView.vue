<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useToast } from "primevue/usetoast";
import Toast from "primevue/toast";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import InputNumber from "primevue/inputnumber";
import Select from "primevue/select";
import ToggleSwitch from "primevue/toggleswitch";
import Button from "primevue/button";
import { proveedoresApi, type Proveedor, type GuardarProveedorRequest } from "@/modules/admin/api/proveedoresApi";
import { cleanText, email, firstError, maxLength, onlyDigits, required, ruc } from "@/shared/validation/inputValidation";

const toast = useToast();
const proveedores = ref<Proveedor[]>([]);
const loading = ref(false);
const dialog = ref(false);
const saving = ref(false);
const editId = ref<number | null>(null);

const tipoContribuyenteOpts = ["S.A.C.", "S.A.", "E.I.R.L.", "Persona Natural con Negocio"];
const estadoRucOpts = ["Activo", "Inactivo"];
const condicionRucOpts = ["Habido", "No Habido"];
const regimenOpts = ["MYPE", "General", "Especial"];
const monedaOpts = ["Soles", "Dólares"];
const plazoOpts = ["Contado", "30 días", "60 días"];

const emptyForm = (): GuardarProveedorRequest => ({
  ruc: "",
  razonSocial: "",
  nombreComercial: "",
  tipoContribuyente: "S.A.C.",
  estadoRuc: "Activo",
  condicionRuc: "Habido",
  departamento: "",
  provincia: "",
  distrito: "",
  direccionFiscal: "",
  regimenTributario: "MYPE",
  agenteRetencionPercepcion: false,
  sujetoDetraccion: false,
  porcentajeDetraccion: null,
  cuentaDetracciones: "",
  bancoPrincipal: "",
  tipoCuenta: "",
  moneda: "Soles",
  numeroCuentaBancaria: "",
  cci: "",
  contactoComercialNombre: "",
  contactoComercialTelefono: "",
  contactoComercialCorreo: "",
  plazoPago: "Contado",
  leadTime: "",
});

const form = ref<GuardarProveedorRequest>(emptyForm());

async function cargar() {
  loading.value = true;
  try {
    proveedores.value = (await proveedoresApi.listar()).data.data;
  } catch {
    toast.add({ severity: "error", summary: "Error al cargar proveedores", life: 3000 });
  } finally {
    loading.value = false;
  }
}

function abrirCrear() {
  editId.value = null;
  form.value = emptyForm();
  dialog.value = true;
}

function abrirEditar(p: Proveedor) {
  editId.value = p.id;
  form.value = {
    ...emptyForm(),
    ...p,
    ruc: p.ruc ?? "",
    razonSocial: p.razonSocial ?? p.nombre,
  };
  dialog.value = true;
}

function payload(): GuardarProveedorRequest {
  return {
    ...form.value,
    ruc: onlyDigits(form.value.ruc),
    razonSocial: cleanText(form.value.razonSocial),
    nombreComercial: cleanText(form.value.nombreComercial),
    departamento: cleanText(form.value.departamento),
    provincia: cleanText(form.value.provincia),
    distrito: cleanText(form.value.distrito),
    direccionFiscal: cleanText(form.value.direccionFiscal),
    cci: onlyDigits(form.value.cci),
    contactoComercialCorreo: cleanText(form.value.contactoComercialCorreo),
  };
}

async function guardar() {
  const data = payload();
  const validationError = firstError([
    ruc(data.ruc),
    required(data.razonSocial, "Razón social"),
    required(data.tipoContribuyente, "Tipo de contribuyente"),
    required(data.estadoRuc, "Estado del RUC"),
    required(data.condicionRuc, "Condición del RUC"),
    data.cci && data.cci.length > 0 && data.cci.length !== 20 && "CCI debe tener 20 dígitos",
    data.contactoComercialCorreo && email(data.contactoComercialCorreo, "Correo comercial"),
    maxLength(data.leadTime, "Tiempo de entrega", 80),
  ]);
  if (validationError) {
    toast.add({ severity: "warn", summary: "Revisa el formulario", detail: validationError, life: 3000 });
    return;
  }
  saving.value = true;
  try {
    if (editId.value) await proveedoresApi.actualizar(editId.value, data);
    else await proveedoresApi.crear(data);
    toast.add({ severity: "success", summary: "Proveedor guardado", life: 2500 });
    dialog.value = false;
    await cargar();
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } };
    toast.add({ severity: "error", summary: "Error al guardar", detail: err.response?.data?.message, life: 3000 });
  } finally {
    saving.value = false;
  }
}

async function desactivar(p: Proveedor) {
  await proveedoresApi.eliminar(p.id);
  await cargar();
}

onMounted(cargar);
</script>

<template>
  <div class="section-page">
    <Toast />
    <div class="section-header">
      <div>
        <h1 class="section-title"><i class="pi pi-truck"></i> Proveedores</h1>
        <p class="section-sub">{{ proveedores.length }} proveedores registrados</p>
      </div>
      <Button label="Nuevo proveedor" icon="pi pi-plus" size="small" @click="abrirCrear" />
    </div>

    <div class="table-wrap">
      <table class="prov-table">
        <thead>
          <tr>
            <th>RUC</th>
            <th>Razón Social</th>
            <th>Comercial</th>
            <th>RUC Estado</th>
            <th>Contacto</th>
            <th>Pago</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading"><td colspan="7" class="empty-cell">Cargando...</td></tr>
          <tr v-else-if="proveedores.length === 0"><td colspan="7" class="empty-cell">Sin proveedores</td></tr>
          <tr v-for="p in proveedores" :key="p.id">
            <td class="mono">{{ p.ruc }}</td>
            <td>{{ p.razonSocial }}</td>
            <td>{{ p.nombreComercial || "—" }}</td>
            <td>{{ p.estadoRuc }} / {{ p.condicionRuc }}</td>
            <td>{{ p.contactoComercialNombre || "—" }}</td>
            <td>{{ p.plazoPago || "—" }}</td>
            <td class="acciones">
              <Button icon="pi pi-pencil" text rounded size="small" @click="abrirEditar(p)" />
              <Button icon="pi pi-ban" text rounded size="small" severity="danger" @click="desactivar(p)" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Dialog v-model:visible="dialog" :header="editId ? 'Editar Proveedor' : 'Nuevo Proveedor'" modal :style="{ width: '760px' }">
      <div class="form-grid">
        <InputText v-model="form.ruc" placeholder="RUC 11 dígitos" maxlength="11" fluid />
        <InputText v-model="form.razonSocial" placeholder="Razón social" fluid />
        <InputText v-model="form.nombreComercial" placeholder="Nombre comercial" fluid />
        <Select v-model="form.tipoContribuyente" :options="tipoContribuyenteOpts" placeholder="Tipo contribuyente" fluid />
        <Select v-model="form.estadoRuc" :options="estadoRucOpts" placeholder="Estado RUC" fluid />
        <Select v-model="form.condicionRuc" :options="condicionRucOpts" placeholder="Condición RUC" fluid />
        <InputText v-model="form.departamento" placeholder="Departamento" fluid />
        <InputText v-model="form.provincia" placeholder="Provincia" fluid />
        <InputText v-model="form.distrito" placeholder="Distrito" fluid />
        <InputText v-model="form.direccionFiscal" placeholder="Dirección fiscal" fluid />
        <Select v-model="form.regimenTributario" :options="regimenOpts" placeholder="Régimen tributario" fluid />
        <div class="switch-row"><span>Agente retención/percepción</span><ToggleSwitch v-model="form.agenteRetencionPercepcion" /></div>
        <div class="switch-row"><span>Sujeto a detracción</span><ToggleSwitch v-model="form.sujetoDetraccion" /></div>
        <InputNumber v-model="form.porcentajeDetraccion" placeholder="% detracción" :min="0" :max="100" fluid />
        <InputText v-model="form.cuentaDetracciones" placeholder="Cuenta detracciones Banco de la Nación" fluid />
        <InputText v-model="form.bancoPrincipal" placeholder="Banco principal" fluid />
        <InputText v-model="form.tipoCuenta" placeholder="Tipo de cuenta" fluid />
        <Select v-model="form.moneda" :options="monedaOpts" placeholder="Moneda" fluid />
        <InputText v-model="form.numeroCuentaBancaria" placeholder="Número de cuenta bancaria" fluid />
        <InputText v-model="form.cci" placeholder="CCI 20 dígitos" maxlength="20" fluid />
        <InputText v-model="form.contactoComercialNombre" placeholder="Contacto comercial" fluid />
        <InputText v-model="form.contactoComercialTelefono" placeholder="Teléfono contacto" fluid />
        <InputText v-model="form.contactoComercialCorreo" placeholder="Correo contacto" fluid />
        <Select v-model="form.plazoPago" :options="plazoOpts" placeholder="Plazo de pago" fluid />
        <InputText v-model="form.leadTime" placeholder="Tiempo de entrega" fluid />
      </div>
      <template #footer>
        <Button label="Cancelar" text @click="dialog = false" :disabled="saving" />
        <Button label="Guardar" icon="pi pi-check" @click="guardar" :loading="saving" />
      </template>
    </Dialog>
  </div>
</template>

<style lang="scss" scoped>
.section-page { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
.section-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
.section-title { font-family: $font-heading; font-size: 1.1rem; font-weight: 700; color: $text-primary; margin: 0; }
.section-title i { margin-right: 0.4rem; color: $violet; }
.section-sub { font-size: 0.75rem; color: $text-muted; margin: 0.15rem 0 0; }
.table-wrap { background: $bg-card; border: 1px solid $border-subtle; border-radius: $r-md; overflow-x: auto; }
.prov-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
.prov-table th { padding: 0.6rem 0.9rem; background: $bg-surface; color: $text-muted; font-size: 0.68rem; text-align: left; text-transform: uppercase; }
.prov-table td { padding: 0.65rem 0.9rem; border-top: 1px solid $border-subtle; color: $text-primary; }
.mono { font-family: $font-mono; }
.empty-cell { text-align: center; color: $text-dim; padding: 2rem !important; }
.acciones { display: flex; gap: 0.15rem; }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.75rem; }
.switch-row { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; padding: 0.45rem 0.7rem; border: 1px solid $border-subtle; border-radius: $r-sm; font-size: 0.82rem; color: $text-muted; }
@media (max-width: 760px) { .form-grid { grid-template-columns: 1fr; } }
</style>
