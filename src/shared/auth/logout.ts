import { authApi } from '@/modules/auth/api/authApi'
import { useAuthStore } from '@/modules/auth/store/authStore'

export async function performLogout() {
  const auth = useAuthStore()
  const refreshToken = auth.refreshToken

  try {
    await authApi.logout(refreshToken)
  } catch {
    // Limpia la sesión local aunque el backend ya no responda.
  }

  auth.logout()
}
