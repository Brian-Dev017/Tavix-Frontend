import api from '@/shared/api/axiosInstance'

export interface LoginPayload {
  usuario: string
  contrasena: string
}

export const authApi = {
  login: (payload: LoginPayload) =>
    api.post<{ data: { accessToken: string; rol: string; nombre: string; apellido: string } }>(
      '/api/auth/login',
      payload
    ),
  logout: () => api.post('/api/auth/logout'),
  refresh: () => api.post<{ data: string }>('/api/auth/refresh')
}
