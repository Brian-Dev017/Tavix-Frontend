<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useToast } from "primevue/usetoast";
import { useConfirm } from "primevue/useconfirm";
import Toast from "primevue/toast";
import ConfirmDialog from "primevue/confirmdialog";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Button from "primevue/button";
import {
  proveedoresApi,
  type Proveedor,
  type GuardarProveedorRequest,
} from "@/modules/admin/api/proveedoresApi";
import {
  cleanText,
  email,
  firstError,
  maxLength,
  nameText,
  phone,
  ruc,
  onlyDigits,
} from "@/shared/validation/inputValidation";

const toast = useToast();
const confirm = useConfirm();

const proveedores = ref<Proveedor[]>([]);
const loading = ref(false);
const dialog = ref(false);
const esEdicion = ref(false);
const saving = ref(false);
const editId = ref<number | null>(null);
const form = ref<GuardarProveedorRequest>({
  nombre: "",
  ruc: "",
  telefono: "",
  correo: "",
  contacto: "",
});

async function cargar() {
  loading.value = true;
  try {
    const res = await proveedoresApi.listar();
    proveedores.value = res.data.data;
  } catch {
    toast.add({
      severity: "error",
      summary: "Error al cargar proveedores",
      life: 3000,
    });
  } finally {
    loading.value = false;
  }
}

function abrirCrear() {
  esEdicion.value = false;
  editId.value = null;
  form.value = { nombre: "", ruc: "", telefono: "", correo: "", contacto: "" };
  dialog.value = true;
}

function abrirEditar(p: Proveedor) {
  esEdicion.value = true;
  editId.value = p.id;
  form.value = {
    nombre: p.nombre,
    ruc: p.ruc ?? "",
    telefono: p.telefono ?? "",
    correo: p.correo ?? "",
    contacto: p.contacto ?? "",
  };
  dialog.value = true;
}

async function guardar() {
  const validationError = firstError([
    nameText(form.value.nombre, "Nombre"),
    form.value.ruc && ruc(form.value.ruc),
    phone(form.value.telefono),
    email(form.value.correo),
    maxLength(form.value.contacto, "Contacto", 80),
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
    const req: GuardarProveedorRequest = {
      nombre: cleanText(form.value.nombre),
      ...(form.value.ruc ? { ruc: onlyDigits(form.value.ruc) } : {}),
      ...(form.value.telefono ? { telefono: cleanText(form.value.telefono) } : {}),
      ...(form.value.correo ? { correo: cleanText(form.value.correo) } : {}),
      ...(form.value.contacto ? { contacto: cleanText(form.value.contacto) } : {}),
    };
    if (esEdicion.value && editId.value !== null) {
      await proveedoresApi.actualizar(editId.value, req);
      toast.add({
        severity: "success",
        summary: "Proveedor actualizado",
        life: 2500,
      });
    } else {
      await proveedoresApi.crear(req);
      toast.add({
        severity: "success",
        summary: "Proveedor creado",
        life: 2500,
      });
    }
    dialog.value = false;
    await cargar();
  } catch {
    toast.add({ severity: "error", summary: "Error al guardar", life: 3000 });
  } finally {
    saving.value = false;
  }
}

function confirmarEliminar(p: Proveedor) {
  confirm.require({
    message: `¿Eliminar al proveedor "${p.nombre}"?`,
    header: "Confirmar eliminación",
    icon: "pi pi-trash",
    rejectLabel: "Cancelar",
    acceptLabel: "Eliminar",
    acceptClass: "p-button-danger",
    accept: async () => {
      try {
        await proveedoresApi.eliminar(p.id);
        toast.add({
          severity: "success",
          summary: "Proveedor eliminado",
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

onMounted(cargar);
</script>

<template>
  <div class="section-page">
    <Toast />
    <ConfirmDialog />

    <!-- Header -->
    <div class="section-header">
      <div>
        <h1 class="section-title"><i class="pi pi-truck"></i> Proveedores</h1>
        <p class="section-sub">
          {{ proveedores.length }} proveedores registrados
        </p>
      </div>
      <Button
        label="Nuevo proveedor"
        icon="pi pi-plus"
        size="small"
        @click="abrirCrear"
      />
    </div>

    <!-- Tabla -->
    <div class="table-wrap">
      <table class="prov-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Nombre</th>
            <th>RUC</th>
            <th>Teléfono</th>
            <th>Correo</th>
            <th>Contacto</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="7" class="empty-cell">
              <i class="pi pi-spinner pi-spin"></i> Cargando…
            </td>
          </tr>
          <tr v-else-if="proveedores.length === 0">
            <td colspan="7" class="empty-cell">Sin proveedores registrados</td>
          </tr>
          <tr v-for="p in proveedores" :key="p.id">
            <td class="id-cell">{{ p.id }}</td>
            <td class="nombre-cell">{{ p.nombre }}</td>
            <td class="mono">{{ p.ruc ?? "—" }}</td>
            <td>{{ p.telefono ?? "—" }}</td>
            <td>{{ p.correo ?? "—" }}</td>
            <td>{{ p.contacto ?? "—" }}</td>
            <td>
              <div class="acciones">
                <Button
                  icon="pi pi-pencil"
                  text
                  rounded
                  size="small"
                  @click="abrirEditar(p)"
                  v-tooltip.top="'Editar'"
                />
                <Button
                  icon="pi pi-trash"
                  text
                  rounded
                  size="small"
                  severity="danger"
                  @click="confirmarEliminar(p)"
                  v-tooltip.top="'Eliminar'"
                />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Dialog Crear/Editar -->
    <Dialog
      v-model:visible="dialog"
      :header="esEdicion ? 'Editar Proveedor' : 'Nuevo Proveedor'"
      :modal="true"
      :style="{ width: '400px' }"
    >
      <div class="form-grid">
        <label class="form-label">Nombre *</label>
        <InputText
          v-model="form.nombre"
          placeholder="Nombre del proveedor"
          fluid
        />

        <label class="form-label">RUC</label>
        <InputText v-model="form.ruc" placeholder="20123456789" fluid />

        <label class="form-label">Teléfono</label>
        <InputText
          v-model="form.telefono"
          placeholder="+51 999 999 999"
          fluid
        />

        <label class="form-label">Correo</label>
        <InputText
          v-model="form.correo"
          placeholder="correo@proveedor.com"
          fluid
        />

        <label class="form-label">Contacto</label>
        <InputText
          v-model="form.contacto"
          placeholder="Nombre del contacto"
          fluid
        />
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
    color: $violet;
  }
}

.section-sub {
  font-size: 0.75rem;
  color: $text-muted;
  margin: 0.15rem 0 0;
}

.table-wrap {
  background: $bg-card;
  border: 1px solid $border-subtle;
  border-radius: $r-md;
  overflow: hidden;
  overflow-x: auto;
}

.prov-table {
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
  }

  tr:last-child td {
    border-bottom: none;
  }

  tr:hover td {
    background: $bg-hover;
  }
}

.id-cell {
  font-family: $font-mono;
  font-size: 0.75rem;
  color: $text-dim;
  width: 3rem;
}

.nombre-cell {
  font-weight: 600;
}

.mono {
  font-family: $font-mono;
  font-size: 0.78rem;
}

.empty-cell {
  text-align: center;
  color: $text-dim;
  padding: 2.5rem !important;
}

.acciones {
  display: flex;
  gap: 0.1rem;
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
