import { computed } from 'vue'
import { useAuthStore } from '@/modules/auth/store/authStore'

export type RolCode = 'AD' | 'ME' | 'CO' | 'CA'

export const ROL_META: Record<RolCode, {
  label: string
  icon: string
  color: string
  bg: string
  border: string
  home: string
}> = {
  AD: {
    label: 'Administrador',
    icon: 'pi-shield',
    color: '#6B8E6E',
    bg: 'rgba(107,142,110,0.1)',
    border: 'rgba(107,142,110,0.3)',
    home: '/admin',
  },
  ME: {
    label: 'Mesero',
    icon: 'pi-user',
    color: '#C8517A',
    bg: 'rgba(200,81,122,0.08)',
    border: 'rgba(200,81,122,0.25)',
    home: '/mesas',
  },
  CO: {
    label: 'Cocinero',
    icon: 'pi-fire',
    color: '#dc2626',
    bg: 'rgba(220,38,38,0.08)',
    border: 'rgba(220,38,38,0.25)',
    home: '/cocina',
  },
  CA: {
    label: 'Cajero',
    icon: 'pi-dollar',
    color: '#16a34a',
    bg: 'rgba(22,163,74,0.08)',
    border: 'rgba(22,163,74,0.25)',
    home: '/caja',
  },
}

export function useRol() {
  const auth = useAuthStore()

  const rolCode = computed(() => auth.rol as RolCode | undefined)
  const rolMeta = computed(() => rolCode.value ? ROL_META[rolCode.value] : null)
  const isAdmin = computed(() => rolCode.value === 'AD')
  const isMesero = computed(() => rolCode.value === 'ME')
  const isCocinero = computed(() => rolCode.value === 'CO')
  const isCajero = computed(() => rolCode.value === 'CA')

  const nombreCompleto = computed(() =>
    auth.user ? `${auth.user.nombre} ${auth.user.apellido}` : ''
  )

  return { rolCode, rolMeta, isAdmin, isMesero, isCocinero, isCajero, nombreCompleto }
}
