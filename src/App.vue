<script setup lang="ts">
import { RouterView } from "vue-router";
import Toast from "primevue/toast";
</script>

<template>
  <Toast />
  <RouterView v-slot="{ Component }">
    <component :is="Component" v-if="Component" />
    <div v-else style="padding: 2rem; font-family: sans-serif; color: #333">
      <h2>Cargando…</h2>
      <p>Si esto persiste, verifica la consola del navegador (F12).</p>
    </div>
  </RouterView>
</template>
