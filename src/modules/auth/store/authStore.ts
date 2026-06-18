import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'
import { decodeJwtPayload } from '@/shared/auth/jwt'

export interface AuthUser {
  nombre: string
  apellido: string
  rol: 'AD' | 'ME' | 'CO' | 'CA'
}

export type AuthRole = AuthUser['rol']

const LEGACY_LS_TOKEN = 'auth_token'
const LEGACY_LS_USER = 'auth_user'
const TAB_REFRESH_TOKEN = 'tab_refresh_token'

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
  const refreshToken = ref<string | null>(sessionStorage.getItem(TAB_REFRESH_TOKEN))
  const user = ref<AuthUser | null>(null)
  const sessionBootstrapped = ref(false)
  let refreshPromise: Promise<string> | null = null

  const isAuthenticated = computed(() => !!accessToken.value)
  const rol = computed(() => user.value?.rol)
  const userId = computed(() => parseJwtSub(accessToken.value))

  function setAccessToken(token: string) {
    accessToken.value = token
    sessionBootstrapped.value = true
  }

  function setRefreshToken(token: string) {
    refreshToken.value = token
    sessionStorage.setItem(TAB_REFRESH_TOKEN, token)
  }

  function setSessionFromToken(token: string) {
    const payload = decodeJwtPayload(token)
    const normalizedRole = normalizeAuthRole(payload?.rol)
    if (!payload || !normalizedRole) {
      throw new Error('El token renovado no contiene una sesion valida')
    }
    accessToken.value = token
    user.value = {
      nombre: String(payload.nombre ?? ''),
      apellido: String(payload.apellido ?? ''),
      rol: normalizedRole,
    }
    sessionBootstrapped.value = true
  }

  function setUser(userData: AuthUser) {
    const normalizedRole = normalizeAuthRole(userData.rol)
    if (!normalizedRole) {
      throw new Error(`Rol no reconocido: ${String(userData.rol)}`)
    }
    user.value = { ...userData, rol: normalizedRole }
  }

  async function refreshSession(): Promise<string> {
    if (!refreshToken.value) {
      throw new Error('Esta pestana no tiene una sesion iniciada')
    }
    if (!refreshPromise) {
      refreshPromise = axios
        .post<{ data: string }>(
          `${import.meta.env.VITE_API_URL}/api/auth/refresh`,
          {},
          {
            headers: { 'X-Refresh-Token': refreshToken.value },
          },
        )
        .then((response) => {
          const token = response.data.data
          setSessionFromToken(token)
          return token
        })
        .finally(() => {
          refreshPromise = null
        })
    }
    return refreshPromise
  }

  async function bootstrapSession() {
    if (sessionBootstrapped.value) return
    if (!refreshToken.value) {
      sessionBootstrapped.value = true
      return
    }
    try {
      await refreshSession()
    } catch {
      logout()
    } finally {
      sessionBootstrapped.value = true
    }
  }

  function logout() {
    accessToken.value = null
    refreshToken.value = null
    user.value = null
    localStorage.removeItem(LEGACY_LS_TOKEN)
    localStorage.removeItem(LEGACY_LS_USER)
    sessionStorage.removeItem(TAB_REFRESH_TOKEN)
    sessionBootstrapped.value = true
  }

  return {
    accessToken,
    refreshToken,
    user,
    isAuthenticated,
    rol,
    userId,
    sessionBootstrapped,
    setAccessToken,
    setRefreshToken,
    setSessionFromToken,
    setUser,
    refreshSession,
    bootstrapSession,
    logout
  }
})
