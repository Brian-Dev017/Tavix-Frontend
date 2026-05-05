import api from '@/shared/api/axiosInstance'

export interface ColaItem {
  detalleId: number
  pedidoId: number
  mesa: string
  producto: string
  cantidad: number
  observaciones: string | null
  estado: 'PENDIENTE' | 'EN_PREPARACION' | 'LISTO'
  solicitadoEn: string
}

export const cocinaApi = {
  getCola: () => api.get<{ data: ColaItem[] }>('/api/cocina/cola'),
  actualizarEstado: (detalleId: number, estado: string) =>
    api.patch(`/api/cocina/items/${detalleId}/estado`, { estado }),
}
