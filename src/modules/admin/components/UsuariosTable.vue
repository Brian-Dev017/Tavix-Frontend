<script setup lang="ts">
import { ref, computed } from "vue";
import { useToast } from "primevue/usetoast";
import { adminApi, type UsuarioAdmin } from "@/modules/admin/api/adminApi";
import { useAuthStore } from "@/modules/auth/store/authStore";
import {
  cleanText,
  firstError,
  nameText,
  oneOf,
  password,
} from "@/shared/validation/inputValidation";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import InputNumber from "primevue/inputnumber";
import Select from "primevue/select";
import Tag from "primevue/tag";
import ToggleSwitch from "primevue/toggleswitch";

const props = defineProps<{ usuarios: UsuarioAdmin[] }>();
const emit = defineEmits<{ reload: [] }>();
const toast = useToast();
const authStore = useAuthStore();

const ROLES = [
  { label: "Administrador", value: "AD" },
  { label: "Mesero", value: "ME" },
  { label: "Cocinero", value: "CO" },
  { label: "Cajero", value: "CA" },
];

const ROL_LABELS: Record<string, string> = {
  AD: "Admin",
  ME: "Mesero",
  CO: "Cocinero",
  CA: "Cajero",
};
const ROL_SEVERITY: Record<string, "danger" | "warn" | "info" | "secondary"> =
  {
    AD: "danger",
    ME: "info",
    CO: "warn",
    CA: "secondary",
  };

// ── Helper: solo usuarios activos pueden editarse ─────────────────────────
function puedeEditar(u: UsuarioAdmin): boolean {
  return u.activo;
}

// ── Crear/Editar usuario ─────────────────────────────────────────────────
const dialogVisible = ref(false);
const esEdicion = ref(false);
const saving = ref(false);

// usuarioDni: string para InputText controlado (DNI = exactamente 8 dígitos numéricos)
const form = ref({
  id: 0,
  nombre: "",
  apellido: "",
  usuarioDni: "" as string,
  contrasena: "",
  rolId: "ME",
  activo: true,
});

// Validación en tiempo real del DNI
const dniTocado = ref(false);
const dniEsValido = computed(() => /^\d{8}$/.test(form.value.usuarioDni));
const dniError = computed(() => {
  if (!dniTocado.value) return "";
  if (!form.value.usuarioDni) return "El DNI es requerido";
  if (!/^\d{8}$/.test(form.value.usuarioDni))
    return "El DNI debe tener exactamente 8 dígitos";
  return "";
});

// Bloquea cualquier tecla que no sea dígito o que supere 8 caracteres
function soloDigitosDni(e: KeyboardEvent) {
  if (!/^\d$/.test(e.key)) {
    e.preventDefault();
    return;
  }
  if (form.value.usuarioDni.length >= 8) {
    e.preventDefault();
  }
}

// Bloquea pegado que contenga no-dígitos o supere 8 caracteres
function pegadoDni(e: ClipboardEvent) {
  e.preventDefault();
  const texto = e.clipboardData?.getData("text") ?? "";
  const soloNum = texto.replace(/\D/g, "");
  const disponible = 8 - form.value.usuarioDni.length;
  form.value.usuarioDni += soloNum.slice(0, disponible);
  dniTocado.value = true;
}

// Botón guardar habilitado solo si el form es válido
const formValido = computed(() => {
  if (!form.value.nombre.trim() || !form.value.apellido.trim()) return false;
  if (!esEdicion.value) {
    if (!dniEsValido.value) return false;
    if (!form.value.contrasena) return false;
  }
  return true;
});

function abrirCrear() {
  form.value = {
    id: 0,
    nombre: "",
    apellido: "",
    usuarioDni: "",
    contrasena: "",
    rolId: "ME",
    activo: true,
  };
  dniTocado.value = false;
  esEdicion.value = false;
  dialogVisible.value = true;
}

function abrirEditar(u: UsuarioAdmin) {
  // Guard: no abrir si el usuario está inactivo
  if (!puedeEditar(u)) return;
  form.value = {
    id: u.id,
    nombre: u.nombre,
    apellido: u.apellido,
    usuarioDni: "",
    contrasena: "",
    rolId: u.rolId,
    activo: u.activo,
  };
  dniTocado.value = false;
  esEdicion.value = true;
  dialogVisible.value = true;
}

async function guardar() {
  if (!esEdicion.value) dniTocado.value = true;

  const validationError = firstError([
    nameText(form.value.nombre, "Nombre"),
    nameText(form.value.apellido, "Apellido"),
    !esEdicion.value && !dniEsValido.value
      ? "El DNI debe tener exactamente 8 dígitos"
      : "",
    !esEdicion.value && password(form.value.contrasena),
    oneOf(
      form.value.rolId,
      ROLES.map((r) => r.value),
      "Rol",
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
    const nombre = cleanText(form.value.nombre);
    const apellido = cleanText(form.value.apellido);
    if (esEdicion.value) {
      await adminApi.actualizarUsuario(form.value.id, {
        nombre,
        apellido,
        rolId: form.value.rolId,
        activo: form.value.activo,
      });
    } else {
      await adminApi.crearUsuario({
        nombre,
        apellido,
        usuario: form.value.usuarioDni,
        contrasena: form.value.contrasena,
        rolId: form.value.rolId,
      });
    }
    toast.add({
      severity: "success",
      summary: esEdicion.value ? "Actualizado" : "Creado",
      detail: "Usuario guardado",
      life: 2500,
    });
    dialogVisible.value = false;
    emit("reload");
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } };
    toast.add({
      severity: "error",
      summary: "Error",
      detail: err.response?.data?.message ?? "No se pudo guardar",
      life: 3000,
    });
  } finally {
    saving.value = false;
  }
}

// ── Reset password ───────────────────────────────────────────────────────
const resetDialog = ref(false);
const resetId = ref(0);
const nuevaPass = ref("");
const resetting = ref(false);

function abrirReset(u: UsuarioAdmin) {
  // Guard: no abrir si el usuario está inactivo
  if (!puedeEditar(u)) return;
  resetId.value = u.id;
  nuevaPass.value = "";
  resetDialog.value = true;
}

async function confirmarReset() {
  const validationError = password(nuevaPass.value, "Nueva contraseña");
  if (validationError) {
    toast.add({
      severity: "warn",
      summary: "Revisa la contraseña",
      detail: validationError,
      life: 3000,
    });
    return;
  }
  if (!nuevaPass.value || nuevaPass.value.length < 6) {
    toast.add({
      severity: "warn",
      summary: "Contraseña corta",
      detail: "Mínimo 6 caracteres",
      life: 3000,
    });
    return;
  }
  resetting.value = true;
  try {
    await adminApi.resetPassword(resetId.value, nuevaPass.value);
    toast.add({
      severity: "success",
      summary: "Contraseña cambiada",
      life: 2500,
    });
    resetDialog.value = false;
  } catch {
    toast.add({
      severity: "error",
      summary: "Error al cambiar contraseña",
      life: 3000,
    });
  } finally {
    resetting.value = false;
  }
}

// ── Toggle activo ────────────────────────────────────────────────────────
async function toggleActivo(u: UsuarioAdmin) {
  if (u.id === authStore.userId) return;
  try {
    await adminApi.actualizarUsuario(u.id, { activo: !u.activo });
    emit("reload");
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } };
    toast.add({
      severity: "error",
      summary: "Error",
      detail: err.response?.data?.message ?? "No se pudo actualizar",
      life: 3000,
    });
  }
}

// ── Búsqueda ─────────────────────────────────────────────────────────────
const busqueda = ref("");
const usuariosFiltrados = computed(() =>
  props.usuarios.filter((u) =>
    `${u.nombre} ${u.apellido} ${u.usuario} ${u.rolId}`
      .toLowerCase()
      .includes(busqueda.value.toLowerCase()),
  ),
);
</script>

<template>
  <div class="tabla-panel">
    <div class="tabla-toolbar">
      <div class="busqueda-wrap">
        <i class="pi pi-search search-icon"></i>
        <input
          v-model="busqueda"
          placeholder="Buscar usuario..."
          class="busqueda-input"
        />
      </div>
      <Button
        label="Nuevo usuario"
        icon="pi pi-plus"
        size="small"
        @click="abrirCrear"
      />
    </div>

    <div class="tabla-scroll">
      <table class="admin-tabla">
        <thead>
          <tr>
            <th>#</th>
            <th>Nombre</th>
            <th>Usuario</th>
            <th>Rol</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="u in usuariosFiltrados"
            :key="u.id"
            :class="{ 'row-inactivo': !u.activo }"
          >
            <td class="id-cell">{{ u.id }}</td>
            <td>
              <div class="nombre-cell">
                <span class="avatar">{{ u.nombre[0] }}{{ u.apellido[0] }}</span>
                <div>
                  <div class="nombre-principal">
                    {{ u.nombre }} {{ u.apellido }}
                  </div>
                </div>
              </div>
            </td>
            <td class="mono">@{{ u.usuario }}</td>
            <td>
              <Tag
                :value="ROL_LABELS[u.rolId]"
                :severity="ROL_SEVERITY[u.rolId]"
              />
            </td>
            <td>
              <div class="estado-cell" @click.stop>
                <ToggleSwitch
                  :modelValue="u.activo"
                  :disabled="u.id === authStore.userId"
                  @update:modelValue="toggleActivo(u)"
                />
                <span :class="u.activo ? 'activo-label' : 'inactivo-label'">
                  {{ u.activo ? "Activo" : "Inactivo" }}
                </span>
              </div>
            </td>
            <td>
              <div class="acciones">
                <!-- Editar: deshabilitado si inactivo -->
                <Button
                  icon="pi pi-pencil"
                  text
                  rounded
                  size="small"
                  :disabled="!puedeEditar(u)"
                  :class="{ 'btn-bloqueado': !puedeEditar(u) }"
                  @click="abrirEditar(u)"
                  aria-label="Editar"
                />
                <!-- Reset contraseña: deshabilitado si inactivo -->
                <Button
                  icon="pi pi-key"
                  text
                  rounded
                  size="small"
                  severity="warn"
                  :disabled="!puedeEditar(u)"
                  :class="{ 'btn-bloqueado': !puedeEditar(u) }"
                  @click="abrirReset(u)"
                  aria-label="Cambiar contraseña"
                />
              </div>
            </td>
          </tr>
          <tr v-if="usuariosFiltrados.length === 0">
            <td colspan="6" class="empty-row">Sin resultados</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Dialog crear/editar -->
    <Dialog
      v-model:visible="dialogVisible"
      :header="esEdicion ? 'Editar usuario' : 'Nuevo usuario'"
      modal
      :style="{ width: '420px' }"
    >
      <div class="form-grid">
        <div class="form-field">
          <label>Nombre</label>
          <InputText v-model="form.nombre" fluid />
        </div>
        <div class="form-field">
          <label>Apellido</label>
          <InputText v-model="form.apellido" fluid />
        </div>

        <!-- Usuario (login): solo en creación, únicamente DNI de 8 dígitos -->
        <div v-if="!esEdicion" class="form-field">
          <label>Usuario (DNI)</label>
          <InputText
            v-model="form.usuarioDni"
            placeholder="12345678"
            fluid
            inputmode="numeric"
            @keypress="soloDigitosDni"
            @paste="pegadoDni"
            @input="dniTocado = true"
          />
          <small v-if="dniError" class="field-error">{{ dniError }}</small>
        </div>

        <div v-if="!esEdicion" class="form-field">
          <label>Contraseña</label>
          <InputText v-model="form.contrasena" type="password" fluid />
        </div>

        <div class="form-field">
          <label>Rol</label>
          <Select
            v-model="form.rolId"
            :options="ROLES"
            optionLabel="label"
            optionValue="value"
            fluid
          />
        </div>

        <div v-if="esEdicion" class="form-field">
          <label>Estado</label>
          <div class="estado-cell">
            <ToggleSwitch v-model="form.activo" />
            <span>{{ form.activo ? "Activo" : "Inactivo" }}</span>
          </div>
        </div>
      </div>

      <template #footer>
        <Button
          label="Cancelar"
          severity="secondary"
          outlined
          @click="dialogVisible = false"
        />
        <Button
          :label="esEdicion ? 'Guardar cambios' : 'Crear usuario'"
          icon="pi pi-check"
          :loading="saving"
          :disabled="!formValido"
          @click="guardar"
        />
      </template>
    </Dialog>

    <!-- Dialog reset password -->
    <Dialog
      v-model:visible="resetDialog"
      header="Cambiar contraseña"
      modal
      :style="{ width: '360px' }"
    >
      <div class="form-field">
        <label>Nueva contraseña</label>
        <InputText
          v-model="nuevaPass"
          type="password"
          fluid
          placeholder="Mínimo 6 caracteres"
        />
      </div>
      <template #footer>
        <Button
          label="Cancelar"
          severity="secondary"
          outlined
          @click="resetDialog = false"
        />
        <Button
          label="Confirmar"
          icon="pi pi-check"
          severity="warn"
          :loading="resetting"
          @click="confirmarReset"
        />
      </template>
    </Dialog>
  </div>
</template>

<style scoped lang="scss">
.tabla-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.tabla-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.busqueda-wrap {
  position: relative;
  flex: 1;
  max-width: 320px;
}
.search-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: $text-muted;
  pointer-events: none;
}
.busqueda-input {
  width: 100%;
  padding: 0.5rem 0.75rem 0.5rem 2.25rem;
  background: $bg-surface;
  border: 1px solid $border-medium;
  border-radius: 0.5rem;
  color: $text-primary;
  font-size: 0.875rem;
  outline: none;
}
.busqueda-input:focus {
  border-color: $amber-dark;
}

.tabla-scroll {
  overflow-x: auto;
}

.admin-tabla {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}
.admin-tabla thead th {
  text-align: left;
  padding: 0.6rem 0.9rem;
  background: $bg-surface;
  color: $text-muted;
  font-weight: 700;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid $border-medium;
}
.admin-tabla tbody td {
  padding: 0.75rem 0.9rem;
  border-bottom: 1px solid $border-subtle;
  color: $text-primary;
  vertical-align: middle;
}
.admin-tabla tbody tr:hover td {
  background: $bg-hover;
}
.row-inactivo td {
  opacity: 0.5;
}

.id-cell {
  color: $text-muted;
  font-size: 0.75rem;
}

.nombre-cell {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}
.avatar {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, $amber-dark, $violet);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}
.nombre-principal {
  font-weight: 600;
}

.mono {
  font-family: monospace;
  color: $text-dim;
}

.estado-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.activo-label {
  color: $c-green;
  font-size: 0.8rem;
  font-weight: 600;
}
.inactivo-label {
  color: $c-red;
  font-size: 0.8rem;
  font-weight: 600;
}

.acciones {
  display: flex;
  gap: 0.25rem;
}

// Botones bloqueados para usuarios inactivos
.btn-bloqueado {
  opacity: 0.35 !important;
  cursor: not-allowed !important;
  pointer-events: none !important;
}

.empty-row {
  text-align: center;
  color: $text-muted;
  padding: 2rem;
}

.form-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-bottom: 0.5rem;
}
.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.form-field label {
  font-size: 0.8rem;
  color: $text-muted;
  font-weight: 600;
}
.field-error {
  color: $c-red;
  font-size: 0.72rem;
  line-height: 1.25;
}
</style>