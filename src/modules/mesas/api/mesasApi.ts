import api from '@/shared/api/axiosInstance'

export interface MesaDTO {
  id: number
  numero: string
  capacidad: number
  estado: 'DISPONIBLE' | 'OCUPADA' | 'RESERVADA' | 'INACTIVA'
  sesionId: number | null
}

export const mesasApi = {
  listar: () => api.get<{ data: MesaDTO[] }>('/api/mesas'),
  abrirSesion: (mesaId: number) =>
    api.post<{ data: number }>('/api/mesas/sesiones', { mesaId })
}
