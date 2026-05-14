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
  type Impresora,
} from "@/modules/admin/api/configuracionApi";
import {
  cleanText,
  firstError,
  host,
  nameText,
  numberRange,
  oneOf,
} from "@/shared/validation/inputValidation";

const toast = useToast();
const confirm = useConfirm();

const impresoras = ref<Impresora[]>([]);
const loading = ref(false);
const saving = ref(false);
const dialog = ref(false);
const esEdit = ref(false);
const editId = ref<number | null>(null);

const TIPOS = [
  { label: "Cocina", value: "COCINA" },
  { label: "Caja", value: "CAJA" },
  { label: "Barra", value: "BARRA" },
];

const TIPO_ICONS: Record<string, string> = {
  COCINA: "pi-bolt",
  CAJA: "pi-calculator",
  BARRA: "pi-glass-martini",
};

const TIPO_COLORS: Record<string, string> = {
  COCINA: "#d97706",
  CAJA: "#2563eb",
  BARRA: "#7c3aed",
};

const form = ref<{
  nombre: string;
  tipo: "COCINA" | "CAJA" | "BARRA";
  host: string;
  puerto: number | null;
  activo: boolean;
}>({
  nombre: "",
  tipo: "COCINA",
  host: "",
  puerto: 9100,
  activo: true,
});

async function cargar() {
  loading.value = true;
  try {
    const res = await configuracionApi.listarImpresoras();
    impresoras.value = res.data.data;
  } catch {
    toast.add({
      severity: "error",
      summary: "Error al cargar impresoras",
      life: 3000,
    });
  } finally {
    loading.value = false;
  }
}

function abrirCrear() {
  esEdit.value = false;
  editId.value = null;
  form.value = {
    nombre: "",
    tipo: "COCINA",
    host: "",
    puerto: 9100,
    activo: true,
  };
  dialog.value = true;
}

function abrirEditar(imp: Impresora) {
  esEdit.value = true;
  editId.value = imp.id;
  form.value = {
    nombre: imp.nombre,
    tipo: imp.tipo,
    host: imp.host ?? "",
    puerto: imp.puerto ?? 9100,
    activo: imp.activo,
  };
  dialog.value = true;
}

async function guardar() {
  const validationError = firstError([
    nameText(form.value.nombre, "Nombre"),
    oneOf(
      form.value.tipo,
      TIPOS.map((t) => t.value),
      "Tipo",
    ),
    host(form.value.host, "Dirección IP"),
    form.value.host && numberRange(form.value.puerto, "Puerto", 1, 65535),
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
    const payload: Omit<Impresora, "id"> = {
      nombre: cleanText(form.value.nombre),
      tipo: form.value.tipo,
      host: cleanText(form.value.host) || null,
      puerto: form.value.host ? Number(form.value.puerto) : null,
      activo: form.value.activo,
    };
    if (esEdit.value && editId.value !== null) {
      await configuracionApi.actualizarImpresora(editId.value, payload);
      toast.add({
        severity: "success",
        summary: "Impresora actualizada",
        life: 2500,
      });
    } else {
      await configuracionApi.crearImpresora(payload);
      toast.add({
        severity: "success",
        summary: "Impresora creada",
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

function confirmarEliminar(imp: Impresora) {
  confirm.require({
    message: `¿Eliminar la impresora "${imp.nombre}"?`,
    header: "Confirmar eliminación",
    icon: "pi pi-trash",
    rejectProps: { label: "Cancelar", severity: "secondary", outlined: true },
    acceptProps: { label: "Eliminar", severity: "danger" },
    accept: async () => {
      try {
        await configuracionApi.eliminarImpresora(imp.id);
        toast.add({
          severity: "success",
          summary: "Impresora eliminada",
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

    <div class="section-header">
      <div>
        <h1 class="section-title">
          <i class="pi pi-print"></i> Impresoras y Dispositivos
        </h1>
        <p class="section-sub">
          {{ impresoras.length }} dispositivo(s) configurado(s)
        </p>
      </div>
      <Button
        label="Nueva impresora"
        icon="pi pi-plus"
        size="small"
        @click="abrirCrear"
      />
    </div>

    <!-- Info -->
    <div class="info-box">
      <i class="pi pi-info-circle"></i>
      <span
        >Configura la IP y puerto de cada ticketera (ejemplo:
        <code>192.168.1.100</code>, puerto <code>9100</code> para
        ESC/POS).</span
      >
    </div>

    <div v-if="loading" class="empty-state">
      <i class="pi pi-spinner pi-spin"></i> Cargando…
    </div>

    <div v-else-if="impresoras.length === 0" class="empty-state">
      Sin impresoras configuradas. Añade al menos una para cocina o caja.
    </div>

    <div v-else class="imp-grid">
      <div
        v-for="imp in impresoras"
        :key="imp.id"
        class="imp-card"
        :class="{ inactive: !imp.activo }"
      >
        <div class="imp-top">
          <div
            class="imp-icon"
            :style="{
              color: TIPO_COLORS[imp.tipo],
              background: TIPO_COLORS[imp.tipo] + '18',
            }"
          >
            <i :class="`pi ${TIPO_ICONS[imp.tipo]}`"></i>
          </div>
          <span class="imp-tipo">{{ imp.tipo }}</span>
          <span class="dot" :class="imp.activo ? 'dot-on' : 'dot-off'"></span>
        </div>
        <div class="imp-nombre">{{ imp.nombre }}</div>
        <div class="imp-addr" v-if="imp.host">
          <i class="pi pi-server"></i>
          {{ imp.host }}{{ imp.puerto ? `:${imp.puerto}` : "" }}
        </div>
        <div class="imp-addr no-addr" v-else>
          <i class="pi pi-times-circle"></i> Sin dirección IP
        </div>
        <div class="imp-actions">
          <button class="act-btn" title="Editar" @click="abrirEditar(imp)">
            <i class="pi pi-pencil"></i>
          </button>
          <button
            class="act-btn act-btn--danger"
            title="Eliminar"
            @click="confirmarEliminar(imp)"
          >
            <i class="pi pi-trash"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Dialog -->
    <Dialog
      v-model:visible="dialog"
      :header="esEdit ? 'Editar Impresora' : 'Nueva Impresora'"
      modal
      :style="{ width: '380px' }"
    >
      <div class="form-grid">
        <label class="form-lbl">Nombre *</label>
        <InputText
          v-model="form.nombre"
          placeholder="Ej: Ticketera Cocina"
          fluid
        />

        <label class="form-lbl">Tipo</label>
        <Select
          v-model="form.tipo"
          :options="TIPOS"
          optionLabel="label"
          optionValue="value"
          fluid
        />

        <label class="form-lbl">Dirección IP</label>
        <InputText v-model="form.host" placeholder="192.168.1.100" fluid />

        <label class="form-lbl">Puerto</label>
        <InputNumber v-model="form.puerto" :min="1" :max="65535" fluid />

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

.info-box {
  background: rgba(37, 99, 235, 0.05);
  border: 1px solid rgba(37, 99, 235, 0.15);
  border-radius: $r-md;
  padding: 0.75rem 1rem;
  font-size: 0.78rem;
  color: $text-muted;
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
  i {
    color: #2563eb;
    margin-top: 2px;
    flex-shrink: 0;
  }
  code {
    font-family: $font-mono;
    font-size: 0.75rem;
    background: $bg-card-alt;
    padding: 0.1rem 0.35rem;
    border-radius: 3px;
  }
}

.imp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.85rem;
}

.imp-card {
  background: $bg-card;
  border: 1px solid $border-subtle;
  border-radius: $r-md;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  transition: all 0.15s;
  &.inactive {
    opacity: 0.55;
  }
}

.imp-top {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.imp-icon {
  width: 34px;
  height: 34px;
  border-radius: $r-sm;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  flex-shrink: 0;
}

.imp-tipo {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: $text-dim;
  text-transform: uppercase;
}

.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  margin-left: auto;
  &-on {
    background: $c-green;
  }
  &-off {
    background: $text-dim;
  }
}

.imp-nombre {
  font-weight: 700;
  font-size: 0.88rem;
  color: $text-primary;
}

.imp-addr {
  font-size: 0.72rem;
  color: $text-muted;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-family: $font-mono;
  &.no-addr {
    color: $text-dim;
    font-family: $font-body;
  }
  i {
    font-size: 0.65rem;
  }
}

.imp-actions {
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
  font-weight: 500;
  color: $text-muted;
}

.empty-state {
  text-align: center;
  color: $text-dim;
  font-size: 0.82rem;
  padding: 2rem;
}
</style>
