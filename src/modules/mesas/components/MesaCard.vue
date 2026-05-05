<script setup lang="ts">
import type { MesaDTO } from "@/modules/mesas/api/mesasApi";

const props = defineProps<{ mesa: MesaDTO }>();
const emit = defineEmits<{ click: [mesa: MesaDTO] }>();

const estadoConfig: Record<
  MesaDTO["estado"],
  { color: string; glow: string; bg: string; label: string; icon: string }
> = {
  DISPONIBLE: {
    color: "#16a34a",
    glow: "rgba(22,163,74,0.15)",
    bg: "rgba(22,163,74,0.07)",
    label: "Disponible",
    icon: "pi-check-circle",
  },
  OCUPADA: {
    color: "#dc2626",
    glow: "rgba(220,38,38,0.15)",
    bg: "rgba(220,38,38,0.07)",
    label: "Ocupada",
    icon: "pi-users",
  },
  RESERVADA: {
    color: "#d97706",
    glow: "rgba(217,119,6,0.15)",
    bg: "rgba(217,119,6,0.07)",
    label: "Reservada",
    icon: "pi-calendar-clock",
  },
  INACTIVA: {
    color: "#9ca3af",
    glow: "transparent",
    bg: "rgba(156,163,175,0.06)",
    label: "Inactiva",
    icon: "pi-ban",
  },
};
</script>

<template>
  <div
    class="mesa-card"
    :class="{
      clickable: mesa.estado === 'DISPONIBLE' || mesa.estado === 'OCUPADA',
      inactiva: mesa.estado === 'INACTIVA',
    }"
    :style="{
      '--c': estadoConfig[mesa.estado].color,
      '--glow': estadoConfig[mesa.estado].glow,
      '--bg': estadoConfig[mesa.estado].bg,
    }"
    @click="emit('click', mesa)"
    role="button"
    :aria-label="`Mesa ${mesa.numero}, ${estadoConfig[mesa.estado].label}`"
  >
    <div class="card-bg"></div>
    <div class="card-inner">
      <div class="card-header">
        <span class="mesa-numero">{{ mesa.numero }}</span>
        <span class="estado-dot"></span>
      </div>
      <div class="estado-icon-wrap">
        <i :class="`pi ${estadoConfig[mesa.estado].icon} estado-ico`"></i>
      </div>
      <div class="card-footer">
        <span class="mesa-estado">{{ estadoConfig[mesa.estado].label }}</span>
        <span class="mesa-cap"
          ><i class="pi pi-users"></i> {{ mesa.capacidad }}</span
        >
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss" src="./MesaCard.scss"></style>
