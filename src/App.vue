<script setup lang="ts">
import { RouterView } from "vue-router";
import Toast from "primevue/toast";
</script>

<template>
  <Toast />
  <RouterView v-slot="{ Component }">
    <component :is="Component" v-if="Component" />
  </RouterView>
</template>
