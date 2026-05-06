<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "primevue/usetoast";
import { useAuthStore } from "@/modules/auth/store/authStore";
import { useRol } from "@/shared/composables/useRol";
import Toast from "primevue/toast";
import Button from "primevue/button";
import Tabs from "primevue/tabs";
import Tab from "primevue/tab";
import TabList from "primevue/tablist";
import TabPanels from "primevue/tabpanels";
import TabPanel from "primevue/tabpanel";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Textarea from "primevue/textarea";
import ConfirmDialog from "primevue/confirmdialog";
import { useConfirm } from "primevue/useconfirm";
import {
  adminApi,
  type UsuarioAdmin,
  type ProductoAdmin,
  type CategoriaAdmin,
  type MesaAdmin,
} from "@/modules/admin/api/adminApi";
import { mesasApi, type MesaDTO } from "@/modules/mesas/api/mesasApi";
import UsuariosTable from "@/modules/admin/components/UsuariosTable.vue";
import ProductosTable from "@/modules/admin/components/ProductosTable.vue";

const router = useRouter();
const toast = useToast();
const auth = useAuthStore();
const confirm = useConfirm();
const { rolMeta, nombreCompleto } = useRol();

const usuarios = ref<UsuarioAdmin[]>([]);
const productos = ref<ProductoAdmin[]>([]);
const categorias = ref<CategoriaAdmin[]>([]);
const mesas = ref<MesaDTO[]>([]);
const mesasAdmin = ref<MesaAdmin[]>([]);
const cargando = ref(true);

interface CategoriaOpcion {
  id: number;
  nombre: string;
}
const categoriasOpciones = ref<CategoriaOpcion[]>([]);

async function cargarTodo() {
  cargando.value = true;
  try {
    const [resU, resP, resC, resM, resMAdmin] = await Promise.all([
      adminApi.listarUsuarios(),
      adminApi.listarProductos(),
      adminApi.listarCategorias(),
      mesasApi.listar(),
      adminApi.listarMesasAdmin(),
    ]);
    usuarios.value = resU.data.data;
    productos.value = resP.data.data;
    categorias.value = resC.data.data;
    mesas.value = resM.data.data;
    mesasAdmin.value = resMAdmin.data.data;
    categoriasOpciones.value = categorias.value
      .filter((c) => c.activo)
      .map((c) => ({ id: c.id, nombre: c.nombre }));
  } catch {
    toast.add({
      severity: "error",
      summary: "Error al cargar datos",
      life: 3000,
    });
  } finally {
    cargando.value = false;
  }
}

const mesasOcupadas = () =>
  mesas.value.filter((m) => m.estado === "OCUPADA").length;
const usuariosActivos = () => usuarios.value.filter((u) => u.activo).length;
const productosDisponibles = () =>
  productos.value.filter((p) => p.disponible).length;

function handleLogout() {
  auth.logout();
  router.push("/login");
}

// --- Gestion de Mesas ---
const mesaDialog = ref(false);
const mesaEsEdicion = ref(false);
const mesaSaving = ref(false);
const mesaEditId = ref(0);
const mesaForm = ref({ numero: "", capacidad: 2 });

function abrirCrearMesa() {
  mesaForm.value = { numero: "", capacidad: 2 };
  mesaEsEdicion.value = false;
  mesaDialog.value = true;
}

function abrirEditarMesa(m: MesaAdmin) {
  mesaEditId.value = m.id;
  mesaForm.value = { numero: m.numero, capacidad: m.capacidad };
  mesaEsEdicion.value = true;
  mesaDialog.value = true;
}

async function guardarMesa() {
  if (!mesaForm.value.numero.trim()) {
    toast.add({ severity: "warn", summary: "Número requerido", life: 2500 });
    return;
  }
  if (mesaForm.value.capacidad < 1) {
    toast.add({ severity: "warn", summary: "Capacidad mínima: 1", life: 2500 });
    return;
  }
  mesaSaving.value = true;
  try {
    if (mesaEsEdicion.value) {
      await adminApi.actualizarMesa(mesaEditId.value, mesaForm.value);
    } else {
      await adminApi.crearMesa(mesaForm.value);
    }
    toast.add({
      severity: "success",
      summary: mesaEsEdicion.value ? "Mesa actualizada" : "Mesa creada",
      life: 2500,
    });
    mesaDialog.value = false;
    await cargarTodo();
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } };
    toast.add({
      severity: "error",
      summary: "Error",
      detail: err.response?.data?.message ?? "No se pudo guardar",
      life: 3000,
    });
  } finally {
    mesaSaving.value = false;
  }
}

async function toggleMesa(m: MesaAdmin) {
  try {
    await adminApi.toggleEstadoMesa(m.id);
    await cargarTodo();
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } };
    toast.add({
      severity: "error",
      summary: "Error",
      detail: err.response?.data?.message ?? "No se pudo cambiar el estado",
      life: 3000,
    });
  }
}

function confirmarEliminarMesa(m: MesaAdmin) {
  confirm.require({
    message: `¿Eliminar la mesa "${m.numero}"? Esta acción es irreversible.`,
    header: "Confirmar eliminación",
    icon: "pi pi-exclamation-triangle",
    rejectProps: { label: "Cancelar", severity: "secondary", outlined: true },
    acceptProps: { label: "Eliminar", severity: "danger" },
    accept: async () => {
      try {
        await adminApi.eliminarMesa(m.id);
        toast.add({
          severity: "success",
          summary: "Mesa eliminada",
          life: 2500,
        });
        await cargarTodo();
      } catch (e: unknown) {
        const err = e as { response?: { data?: { message?: string } } };
        toast.add({
          severity: "error",
          summary: "Error",
          detail: err.response?.data?.message ?? "No se pudo eliminar",
          life: 3000,
        });
      }
    },
  });
}

const catDialog = ref(false);
const catEsEdicion = ref(false);
const catSaving = ref(false);
const catEditId = ref(0);
const catForm = ref({ nombre: "", descripcion: "" });

function abrirCrearCat() {
  catForm.value = { nombre: "", descripcion: "" };
  catEsEdicion.value = false;
  catDialog.value = true;
}

function abrirEditarCat(c: CategoriaAdmin) {
  catEditId.value = c.id;
  catForm.value = { nombre: c.nombre, descripcion: c.descripcion ?? "" };
  catEsEdicion.value = true;
  catDialog.value = true;
}

async function guardarCat() {
  if (!catForm.value.nombre.trim()) {
    toast.add({ severity: "warn", summary: "Nombre requerido", life: 2500 });
    return;
  }
  catSaving.value = true;
  try {
    if (catEsEdicion.value) {
      await adminApi.actualizarCategoria(catEditId.value, catForm.value);
    } else {
      await adminApi.crearCategoria(catForm.value);
    }
    toast.add({
      severity: "success",
      summary: catEsEdicion.value
        ? "Categoría actualizada"
        : "Categoría creada",
      life: 2500,
    });
    catDialog.value = false;
    await cargarTodo();
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } };
    toast.add({
      severity: "error",
      summary: "Error",
      detail: err.response?.data?.message ?? "No se pudo guardar",
      life: 3000,
    });
  } finally {
    catSaving.value = false;
  }
}

function confirmarEliminarCat(c: CategoriaAdmin) {
  confirm.require({
    message: `¿Eliminar la categoría "${c.nombre}"? Los productos asociados quedarán sin categoría.`,
    header: "Confirmar eliminación",
    icon: "pi pi-exclamation-triangle",
    rejectProps: { label: "Cancelar", severity: "secondary", outlined: true },
    acceptProps: { label: "Eliminar", severity: "danger" },
    accept: async () => {
      try {
        await adminApi.eliminarCategoria(c.id);
        toast.add({
          severity: "success",
          summary: "Categoría eliminada",
          life: 2500,
        });
        await cargarTodo();
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

onMounted(cargarTodo);
</script>

<template>
  <div class="admin-view">
    <Toast />
    <ConfirmDialog />

    <!-- Header -->
    <header class="page-header">
      <div>
        <h1 class="page-title">
          <i
            class="pi pi-shield"
            style="color: #d67b93; margin-right: 0.4rem; font-size: 1rem"
          ></i>
          Tavix — Panel Administrador
        </h1>
        <p class="page-subtitle">{{ nombreCompleto }}</p>
      </div>

      <div class="page-actions">
        <button class="nav-btn" @click="router.push('/mesas')">
          <i class="pi pi-table"></i><span>Mesas</span>
        </button>
        <button class="nav-btn" @click="router.push('/caja')">
          <i class="pi pi-wallet"></i><span>Caja</span>
        </button>
        <button class="nav-btn" @click="router.push('/cocina')">
          <i class="pi pi-bolt"></i><span>Cocina</span>
        </button>

        <span
          class="rol-chip"
          :style="{
            color: rolMeta?.color,
            background: rolMeta?.bg,
            borderColor: rolMeta?.border,
          }"
        >
          <i :class="`pi ${rolMeta?.icon}`"></i>
          {{ rolMeta?.label }}
        </span>

        <button class="logout-btn" @click="handleLogout">
          <i class="pi pi-sign-out"></i><span>Salir</span>
        </button>
      </div>
    </header>

    <!-- Stat cards -->
    <div v-if="!cargando" class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon si-indigo"><i class="pi pi-users"></i></div>
        <div class="stat-body">
          <span class="stat-val">{{ usuariosActivos() }}</span>
          <span class="stat-lbl">Usuarios activos</span>
        </div>
        <div class="stat-total">/ {{ usuarios.length }} total</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon si-emerald">
          <i class="pi pi-shopping-cart"></i>
        </div>
        <div class="stat-body">
          <span class="stat-val">{{ productosDisponibles() }}</span>
          <span class="stat-lbl">Productos disponibles</span>
        </div>
        <div class="stat-total">/ {{ productos.length }} total</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon si-amber"><i class="pi pi-tags"></i></div>
        <div class="stat-body">
          <span class="stat-val">{{ categorias.length }}</span>
          <span class="stat-lbl">Categorías</span>
        </div>
        <div class="stat-total">en menú</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon si-rose"><i class="pi pi-table"></i></div>
        <div class="stat-body">
          <span class="stat-val">{{ mesasOcupadas() }}</span>
          <span class="stat-lbl">Mesas ocupadas</span>
        </div>
        <div class="stat-total">/ {{ mesasAdmin.length }} total</div>
      </div>
    </div>
    <div v-else class="stats-grid">
      <div v-for="i in 4" :key="i" class="stat-card stat-skeleton"></div>
    </div>

    <!-- Tabs -->
    <div class="main-panel">
      <Tabs value="0">
        <TabList>
          <Tab value="0"
            ><i class="pi pi-users tab-ico"></i>Usuarios<span
              class="tab-pill"
              >{{ usuarios.length }}</span
            ></Tab
          >
          <Tab value="1"
            ><i class="pi pi-shopping-cart tab-ico"></i>Productos<span
              class="tab-pill"
              >{{ productos.length }}</span
            ></Tab
          >
          <Tab value="2"
            ><i class="pi pi-tags tab-ico"></i>Categorías<span
              class="tab-pill"
              >{{ categorias.length }}</span
            ></Tab
          >
          <Tab value="3"
            ><i class="pi pi-table tab-ico"></i>Mesas<span class="tab-pill">{{
              mesasAdmin.length
            }}</span></Tab
          >
        </TabList>
        <TabPanels>
          <TabPanel value="0">
            <div v-if="cargando" class="loading-slot">
              <i class="pi pi-spin pi-spinner load-spinner"></i>
            </div>
            <UsuariosTable v-else :usuarios="usuarios" @reload="cargarTodo" />
          </TabPanel>
          <TabPanel value="1">
            <div v-if="cargando" class="loading-slot">
              <i class="pi pi-spin pi-spinner load-spinner"></i>
            </div>
            <div v-else-if="categorias.length === 0" class="empty-hint">
              <i
                class="pi pi-info-circle"
                style="font-size: 1.5rem; color: #f59e0b"
              ></i>
              <p>
                Primero crea al menos una <strong>categoría</strong> en la
                pestaña "Categorías".
              </p>
            </div>
            <ProductosTable
              v-else
              :productos="productos"
              :categorias="categoriasOpciones"
              @reload="cargarTodo"
            />
          </TabPanel>
          <TabPanel value="2">
            <div v-if="cargando" class="loading-slot">
              <i class="pi pi-spin pi-spinner load-spinner"></i>
            </div>
            <div v-else>
              <div class="cat-toolbar">
                <span class="section-desc"
                  >Gestiona las categorías del menú</span
                >
                <Button
                  label="Nueva categoría"
                  icon="pi pi-plus"
                  size="small"
                  @click="abrirCrearCat"
                />
              </div>
              <div class="cat-grid">
                <div v-for="c in categorias" :key="c.id" class="cat-card">
                  <div class="cat-card-top">
                    <div class="cat-icon"><i class="pi pi-tag"></i></div>
                    <div class="cat-actions">
                      <button class="cat-btn-edit" @click="abrirEditarCat(c)">
                        <i class="pi pi-pencil"></i>
                      </button>
                      <button
                        class="cat-btn-del"
                        @click="confirmarEliminarCat(c)"
                      >
                        <i class="pi pi-trash"></i>
                      </button>
                    </div>
                  </div>
                  <div class="cat-nombre">{{ c.nombre }}</div>
                  <div class="cat-desc">
                    {{ c.descripcion || "Sin descripción" }}
                  </div>
                  <div class="cat-products-count">
                    {{ productos.filter((p) => p.categoriaId === c.id).length }}
                    productos
                  </div>
                </div>
                <div v-if="categorias.length === 0" class="cat-empty">
                  <i
                    class="pi pi-tag"
                    style="font-size: 2.5rem; color: #2d3748"
                  ></i>
                  <p>No hay categorías. Crea la primera para empezar.</p>
                  <Button
                    label="Crear categoría"
                    icon="pi pi-plus"
                    size="small"
                    @click="abrirCrearCat"
                  />
                </div>
              </div>
            </div>
          </TabPanel>
          <!-- Mesas -->
          <TabPanel value="3">
            <div v-if="cargando" class="loading-slot">
              <i class="pi pi-spin pi-spinner load-spinner"></i>
            </div>
            <div v-else>
              <div class="cat-toolbar">
                <span class="section-desc"
                  >Gestiona las mesas del restaurante</span
                >
                <Button
                  label="Nueva mesa"
                  icon="pi pi-plus"
                  size="small"
                  @click="abrirCrearMesa"
                />
              </div>
              <div
                v-if="mesasAdmin.length === 0"
                class="cat-empty"
                style="grid-column: unset"
              >
                <i
                  class="pi pi-table"
                  style="font-size: 2.5rem; color: #2d3748"
                ></i>
                <p>
                  No hay mesas. Crea la primera para que los mozos puedan
                  operar.
                </p>
                <Button
                  label="Crear mesa"
                  icon="pi pi-plus"
                  size="small"
                  @click="abrirCrearMesa"
                />
              </div>
              <div v-else class="mesa-admin-grid">
                <div
                  v-for="m in mesasAdmin"
                  :key="m.id"
                  class="mesa-admin-card"
                >
                  <div class="mesa-admin-top">
                    <div class="mesa-admin-num">{{ m.numero }}</div>
                    <span
                      class="mesa-badge"
                      :class="'mb-' + m.estado.toLowerCase()"
                      >{{ m.estado }}</span
                    >
                  </div>
                  <div class="mesa-admin-cap">
                    <i class="pi pi-users"></i> {{ m.capacidad }} personas
                  </div>
                  <div class="mesa-admin-actions">
                    <button
                      class="cat-btn-edit"
                      @click="abrirEditarMesa(m)"
                      :disabled="m.estado === 'OCUPADA'"
                      title="Editar"
                    >
                      <i class="pi pi-pencil"></i>
                    </button>
                    <button
                      class="cat-btn-edit"
                      @click="toggleMesa(m)"
                      :disabled="
                        m.estado === 'OCUPADA' || m.estado === 'RESERVADA'
                      "
                      :title="
                        m.estado === 'INACTIVA'
                          ? 'Activar mesa'
                          : 'Desactivar mesa'
                      "
                    >
                      <i
                        :class="
                          m.estado === 'INACTIVA'
                            ? 'pi pi-eye'
                            : 'pi pi-eye-slash'
                        "
                      ></i>
                    </button>
                    <button
                      class="cat-btn-del"
                      @click="confirmarEliminarMesa(m)"
                      :disabled="m.estado === 'OCUPADA'"
                      title="Eliminar"
                    >
                      <i class="pi pi-trash"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>

    <!-- Dialog categoría -->
    <Dialog
      v-model:visible="catDialog"
      :header="catEsEdicion ? 'Editar categoría' : 'Nueva categoría'"
      modal
      :style="{ width: '380px' }"
    >
      <div class="form-grid">
        <div class="form-field">
          <label>Nombre <span class="req">*</span></label>
          <InputText
            v-model="catForm.nombre"
            fluid
            placeholder="Ej: Entradas, Bebidas..."
          />
        </div>
        <div class="form-field">
          <label>Descripción</label>
          <Textarea
            v-model="catForm.descripcion"
            rows="2"
            fluid
            placeholder="Descripción opcional"
          />
        </div>
      </div>
      <template #footer>
        <Button
          label="Cancelar"
          severity="secondary"
          outlined
          @click="catDialog = false"
        />
        <Button
          :label="catEsEdicion ? 'Guardar cambios' : 'Crear categoría'"
          icon="pi pi-check"
          :loading="catSaving"
          @click="guardarCat"
        />
      </template>
    </Dialog>

    <!-- Dialog mesa -->
    <Dialog
      v-model:visible="mesaDialog"
      :header="mesaEsEdicion ? 'Editar mesa' : 'Nueva mesa'"
      modal
      :style="{ width: '340px' }"
    >
      <div class="form-grid">
        <div class="form-field">
          <label>Número / Nombre <span class="req">*</span></label>
          <InputText
            v-model="mesaForm.numero"
            fluid
            placeholder="Ej: 01, A1, BAR..."
            maxlength="5"
          />
        </div>
        <div class="form-field">
          <label>Capacidad (personas) <span class="req">*</span></label>
          <InputText
            v-model.number="mesaForm.capacidad"
            type="number"
            fluid
            min="1"
            max="30"
          />
        </div>
      </div>
      <template #footer>
        <Button
          label="Cancelar"
          severity="secondary"
          outlined
          @click="mesaDialog = false"
        />
        <Button
          :label="mesaEsEdicion ? 'Guardar cambios' : 'Crear mesa'"
          icon="pi pi-check"
          :loading="mesaSaving"
          @click="guardarMesa"
        />
      </template>
    </Dialog>
  </div>
</template>

<style scoped lang="scss" src="./AdminView.scss"></style>
