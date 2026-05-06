<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/modules/auth/store/authStore";
import { authApi } from "@/modules/auth/api/authApi";
import InputText from "primevue/inputtext";
import Password from "primevue/password";
import Button from "primevue/button";
import Message from "primevue/message";

const router = useRouter();
const auth = useAuthStore();

const usuario = ref("");
const contrasena = ref("");
const loading = ref(false);
const error = ref("");

async function handleLogin() {
  if (!usuario.value || !contrasena.value) return;
  loading.value = true;
  error.value = "";
  try {
    const res = await authApi.login({
      usuario: usuario.value,
      contrasena: contrasena.value,
    });
    const data = res?.data?.data;
    if (!data?.accessToken) {
      throw new Error(
        "Respuesta del servidor incompleta: " + JSON.stringify(res?.data),
      );
    }
    const { accessToken, rol, nombre, apellido } = data;
    auth.setAccessToken(accessToken);
    auth.setUser({ nombre, apellido, rol: rol as "AD" | "ME" | "CO" | "CA" });
    const routes: Record<string, string> = {
      ME: "/mesas",
      CO: "/cocina",
      CA: "/caja",
      AD: "/admin",
    };
    await router.push(routes[rol] ?? "/mesas");
  } catch (e: unknown) {
    console.error("[login] error:", e);
    const err = e as {
      response?: { data?: { message?: string } };
      message?: string;
    };
    error.value =
      err?.response?.data?.message ?? err?.message ?? "Error al iniciar sesión";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="login-page">
    <!-- Blobs de fondo -->
    <div class="login-blob lb-1" />
    <div class="login-blob lb-2" />
    <div class="login-blob lb-3" />

    <!-- Tarjeta central -->
    <div class="login-card">
      <!-- Barra accent superior -->
      <div class="login-accent-bar" />

      <div class="login-body">
        <!-- Logo + Marca -->
        <div class="login-logo-wrap">
          <div class="login-logo">
            <i class="pi pi-bolt"></i>
          </div>
          <div>
            <h1 class="login-brand-name">Tavix</h1>
          </div>
        </div>

        <!-- Formulario -->
        <form @submit.prevent="handleLogin" class="login-form">
          <Message v-if="error" severity="error" :closable="false">{{
            error
          }}</Message>

          <div class="field">
            <label for="usuario">Usuario</label>
            <InputText
              id="usuario"
              v-model="usuario"
              placeholder="Tu nombre de usuario"
              autocomplete="username"
              fluid
            />
          </div>

          <div class="field">
            <label for="contrasena">Contraseña</label>
            <Password
              id="contrasena"
              v-model="contrasena"
              placeholder="Tu contraseña"
              :feedback="false"
              toggleMask
              fluid
            />
          </div>

          <Button
            type="submit"
            label="Acceder al Sistema"
            icon="pi pi-sign-in"
            :loading="loading"
            fluid
            class="login-submit"
          />
        </form>
      </div>

      <!-- Pie -->
      <div class="login-footer">
        <i class="pi pi-info-circle"></i>
        <span>¿Necesitas ayuda? Contacta Soporte</span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss" src="./LoginView.scss"></style>
