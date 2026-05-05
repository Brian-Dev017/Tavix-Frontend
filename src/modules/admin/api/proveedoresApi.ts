import api from '@/shared/api/axiosInstance'

export interface Proveedor {
  id: number
  nombre: string
  ruc: string | null
  telefono: string | null
  correo: string | null
  contacto: string | null
  activo: boolean
}

export interface GuardarProveedorRequest {
  nombre: string
  ruc?: string
  telefono?: string
  correo?: string
  contacto?: string
}

export const proveedoresApi = {
  listar:     () => api.get<{ data: Proveedor[] }>('/api/proveedores'),
  crear:      (req: GuardarProveedorRequest) => api.post<{ data: Proveedor }>('/api/proveedores', req),
  actualizar: (id: number, req: GuardarProveedorRequest) => api.put<{ data: Proveedor }>(`/api/proveedores/${id}`, req),
  eliminar:   (id: number) => api.delete(`/api/proveedores/${id}`),
}
