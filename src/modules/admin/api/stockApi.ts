import api from '@/shared/api/axiosInstance'

export interface Insumo {
  id: number
  nombre: string
  unidad: string
  stockActual: number
  stockMinimo: number
  activo: boolean
}

export interface GuardarInsumoRequest {
  nombre: string
  unidad: string
  stockActual: number
  stockMinimo: number
}

export const stockApi = {
  listar:   () => api.get<{ data: Insumo[] }>('/api/stock/insumos'),
  crear:    (req: GuardarInsumoRequest) => api.post<{ data: Insumo }>('/api/stock/insumos', req),
  actualizar: (id: number, req: GuardarInsumoRequest) => api.put<{ data: Insumo }>(`/api/stock/insumos/${id}`, req),
  ajustarStock: (id: number, ajuste: number) => api.patch(`/api/stock/insumos/${id}/stock`, { ajuste }),
  eliminar: (id: number) => api.delete(`/api/stock/insumos/${id}`),
}
