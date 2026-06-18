import api from '@/shared/api/axiosInstance'

export interface LoginPayload {
  usuario: string
  contrasena: string
}

export interface LoginData {
  accessToken: string
  refreshToken: string
  rol: string
  nombre: string
  apellido: string
}

export const authApi = {
  login: (payload: LoginPayload) =>
    api.post<{ data: LoginData }>(
      '/api/auth/login',
      payload
    ),
  logout: (refreshToken: string | null) =>
    api.post('/api/auth/logout', {}, {
      headers: refreshToken ? { 'X-Refresh-Token': refreshToken } : undefined,
    }),
  refresh: (refreshToken: string) =>
    api.post<{ data: string }>('/api/auth/refresh', {}, {
      headers: { 'X-Refresh-Token': refreshToken },
    })
}
