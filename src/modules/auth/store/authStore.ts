import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface AuthUser {
  nombre: string
  apellido: string
  rol: 'AD' | 'ME' | 'CO' | 'CA'
}

const LS_TOKEN = 'auth_token'
const LS_USER  = 'auth_user'

function parseJwtSub(token: string | null): number | null {
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.sub ? Number(payload.sub) : null
  } catch {
    return null
  }
}

const VALID_ROLES = ['AD', 'ME', 'CO', 'CA']

export const useAuthStore = defineStore('auth', () => {
  // Leer estado persistido
  let _token = localStorage.getItem(LS_TOKEN)
  let _user: AuthUser | null = null
  try { _user = JSON.parse(localStorage.getItem(LS_USER) ?? 'null') } catch { /* ignore */ }

  // Sanidad: limpiar si hay token sin usuario válido (estado corrupto → causaba loop)
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
    user.value = userData
    localStorage.setItem(LS_USER, JSON.stringify(userData))
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
