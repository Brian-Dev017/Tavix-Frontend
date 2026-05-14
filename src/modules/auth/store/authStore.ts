import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { decodeJwtPayload } from '@/shared/auth/jwt'

export interface AuthUser {
  nombre: string
  apellido: string
  rol: 'AD' | 'ME' | 'CO' | 'CA'
}

export type AuthRole = AuthUser['rol']

const LS_TOKEN = 'auth_token'
const LS_USER  = 'auth_user'

function parseJwtSub(token: string | null): number | null {
  const payload = decodeJwtPayload(token)
  return payload?.sub ? Number(payload.sub) : null
}

const VALID_ROLES = ['AD', 'ME', 'CO', 'CA']

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
  // Leer estado persistido
  let _token = localStorage.getItem(LS_TOKEN)
  let _user: AuthUser | null = null
  try { _user = JSON.parse(localStorage.getItem(LS_USER) ?? 'null') } catch { /* ignore */ }

  // Sanidad: limpiar si hay token sin usuario válido (estado corrupto → causaba loop)
  if (_user) {
    const normalizedRole = normalizeAuthRole(_user.rol)
    if (normalizedRole) _user.rol = normalizedRole
  }

  if (_token && (!_user || !VALID_ROLES.includes(_user.rol))) {
    localStorage.removeItem(LS_TOKEN)
    localStorage.removeItem(LS_USER)
    _token = null
    _user = null
  }

  const accessToken = ref<string | null>(_token)
  const user = ref<AuthUser | null>(_user)

  const isAuthenticated = computed(() => !!accessToken.value)
  const rol = computed(() => user.value?.rol)
  const userId = computed(() => parseJwtSub(accessToken.value))

  function setAccessToken(token: string) {
    accessToken.value = token
    localStorage.setItem(LS_TOKEN, token)
  }

  function setUser(userData: AuthUser) {
    const normalizedRole = normalizeAuthRole(userData.rol)
    if (!normalizedRole) {
      throw new Error(`Rol no reconocido: ${String(userData.rol)}`)
    }
    const normalizedUser = { ...userData, rol: normalizedRole }
    user.value = normalizedUser
    localStorage.setItem(LS_USER, JSON.stringify(normalizedUser))
  }

  function logout() {
    accessToken.value = null
    user.value = null
    localStorage.removeItem(LS_TOKEN)
    localStorage.removeItem(LS_USER)
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
