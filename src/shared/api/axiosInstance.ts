import axios from 'axios'
import { useAuthStore } from '@/modules/auth/store/authStore'
import { decodeJwtPayload } from '@/shared/auth/jwt'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL as string,
  withCredentials: true
})

/** Comprueba si el JWT ya expiró sin hacer una petición al servidor */
function isTokenExpired(token: string | null): boolean {
  if (!token) return true
  const payload = decodeJwtPayload(token)
  return payload?.exp ? payload.exp * 1000 < Date.now() : true
}

api.interceptors.request.use((config) => {
  const auth = useAuthStore()
  if (auth.accessToken) {
    config.headers.Authorization = `Bearer ${auth.accessToken}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    const status = error.response?.status

    // Manejar 401 (no autorizado) y 403 cuando proviene de token inválido/expirado
    const isAuthError = status === 401 || (status === 403 && isTokenExpired(useAuthStore().accessToken))

    if (isAuthError && original && !original._retry) {
      original._retry = true
      try {
        const res = await axios.post(
          `${import.meta.env.VITE_API_URL}/api/auth/refresh`,
          {},
          { withCredentials: true }
        )
        const auth = useAuthStore()
        auth.setAccessToken(res.data.data)
        original.headers.Authorization = `Bearer ${res.data.data}`
        return api(original)
      } catch {
        const auth = useAuthStore()
        auth.logout()
        window.location.href = '/login'
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  }
)

export default api
