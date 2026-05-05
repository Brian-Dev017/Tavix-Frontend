import api from '@/shared/api/axiosInstance'

export interface NegocioConfig {
  id: number
  rucNegocio: string | null
  nombreComercial: string | null
  direccion: string | null
  logoUrl: string | null
  igvPorcentaje: number
}

export interface SerieComprobante {
  id: number
  tipo: 'B' | 'F' | 'T'
  serie: string
  correlativoActual: number
  activo: boolean
}

export interface Impresora {
  id: number
  nombre: string
  tipo: 'COCINA' | 'CAJA' | 'BARRA'
  host: string | null
  puerto: number | null
  activo: boolean
}

export const configuracionApi = {
  // Negocio
  getNegocio:      () => api.get<{ data: NegocioConfig }>('/api/config/negocio'),
  updateNegocio:   (req: Partial<NegocioConfig>) => api.put<{ data: NegocioConfig }>('/api/config/negocio', req),

  // Series
  listarSeries:    () => api.get<{ data: SerieComprobante[] }>('/api/config/series'),
  crearSerie:      (req: Omit<SerieComprobante, 'id'>) => api.post<{ data: SerieComprobante }>('/api/config/series', req),
  actualizarSerie: (id: number, req: Partial<SerieComprobante>) => api.put<{ data: SerieComprobante }>(`/api/config/series/${id}`, req),
  eliminarSerie:   (id: number) => api.delete(`/api/config/series/${id}`),

  // Impresoras
  listarImpresoras:     () => api.get<{ data: Impresora[] }>('/api/config/impresoras'),
  crearImpresora:       (req: Omit<Impresora, 'id'>) => api.post<{ data: Impresora }>('/api/config/impresoras', req),
  actualizarImpresora:  (id: number, req: Partial<Impresora>) => api.put<{ data: Impresora }>(`/api/config/impresoras/${id}`, req),
  eliminarImpresora:    (id: number) => api.delete(`/api/config/impresoras/${id}`),
}
