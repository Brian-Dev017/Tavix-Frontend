import api from '@/shared/api/axiosInstance'

export interface Proveedor {
  id: number
  razonSocial: string
  nombre: string
  nombreComercial: string | null
  ruc: string | null
  tipoContribuyente: string | null
  estadoRuc: string | null
  condicionRuc: string | null
  departamento: string | null
  provincia: string | null
  distrito: string | null
  direccionFiscal: string | null
  regimenTributario: string | null
  agenteRetencionPercepcion: boolean
  sujetoDetraccion: boolean
  porcentajeDetraccion: number | null
  cuentaDetracciones: string | null
  bancoPrincipal: string | null
  tipoCuenta: string | null
  moneda: string | null
  numeroCuentaBancaria: string | null
  cci: string | null
  contactoComercialNombre: string | null
  contactoComercialTelefono: string | null
  contactoComercialCorreo: string | null
  plazoPago: string | null
  leadTime: string | null
  activo: boolean
}

export type GuardarProveedorRequest = Partial<Proveedor> & {
  ruc: string
  razonSocial: string
  tipoContribuyente: string
  estadoRuc: string
  condicionRuc: string
}

export const proveedoresApi = {
  listar:     () => api.get<{ data: Proveedor[] }>('/api/proveedores'),
  crear:      (req: GuardarProveedorRequest) => api.post<{ data: Proveedor }>('/api/proveedores', req),
  actualizar: (id: number, req: GuardarProveedorRequest) => api.put<{ data: Proveedor }>(`/api/proveedores/${id}`, req),
  eliminar:   (id: number) => api.delete(`/api/proveedores/${id}`),
}
