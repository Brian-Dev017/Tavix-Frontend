import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { decodeJwtPayload } from '@/shared/auth/jwt'

export interface AuthUser {
  nombre: string
  apellido: string
  rol: 'AD' | 'ME' | 'CO' | 'CA'
}

export type AuthRole = AuthUser['rol']

const LEGACY_LS_TOKEN = 'auth_token'
const LEGACY_LS_USER = 'auth_user'

function parseJwtSub(token: string | null): number | null {
  const payload = decodeJwtPayload(token)
  return payload?.sub ? Number(payload.sub) : null
}

export function normalizeAuthRole(value: unknown): AuthRole | null {
  const raw = String(value ?? '').trim().toUpperCase()
  const aliases: Record<string, AuthRole> = {
    AD: 'AD',
    ADMIN: 'AD',
    ADMINISTRADOR: 'AD',
    ROLE_ADMIN: 'AD',
    ROLE_ADMINISTRADOR: 'AD',
    ME: 'ME',
    MESERO: 'ME',
    MOZO: 'ME',
    ROLE_MESERO: 'ME',
    ROLE_MOZO: 'ME',
    CO: 'CO',
    COCINA: 'CO',
    COCINERO: 'CO',
    ROLE_COCINA: 'CO',
    ROLE_COCINERO: 'CO',
    CA: 'CA',
    CAJA: 'CA',
    CAJERO: 'CA',
    ROLE_CAJA: 'CA',
    ROLE_CAJERO: 'CA',
  }
  return aliases[raw] ?? null
}

export const useAuthStore = defineStore('auth', () => {
  localStorage.removeItem(LEGACY_LS_TOKEN)
  localStorage.removeItem(LEGACY_LS_USER)

  const accessToken = ref<string | null>(null)
  const user = ref<AuthUser | null>(null)

  const isAuthenticated = computed(() => !!accessToken.value)
  const rol = computed(() => user.value?.rol)
  const userId = computed(() => parseJwtSub(accessToken.value))

  function setAccessToken(token: string) {
    accessToken.value = token
  }

  function setUser(userData: AuthUser) {
    const normalizedRole = normalizeAuthRole(userData.rol)
    if (!normalizedRole) {
      throw new Error(`Rol no reconocido: ${String(userData.rol)}`)
    }
    user.value = { ...userData, rol: normalizedRole }
  }

  function logout() {
    accessToken.value = null
    user.value = null
    localStorage.removeItem(LEGACY_LS_TOKEN)
    localStorage.removeItem(LEGACY_LS_USER)
  }

  return {
    accessToken,
    user,
    isAuthenticated,
    rol,
    userId,
    setAccessToken,
    setUser,
    logout
  }
})
