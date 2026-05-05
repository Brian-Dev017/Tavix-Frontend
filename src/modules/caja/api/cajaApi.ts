import api from '@/shared/api/axiosInstance'

export interface PedidoResumen {
  pedidoId: number
  mesa: string
  mesero: string
  totalItems: number
  subtotal: number
  igv: number
  totalConIgv: number
  estadoPedido: string
}

export interface DatosComprobanteRequest {
  rucDni: string
  razonSocial: string
  direccion?: string
}

export interface EmitirComprobanteRequest {
  pedidoId: number
  tipoComprobanteId: string
  metodoPago: string
  datosComprobante?: DatosComprobanteRequest
}

export interface ComprobanteResponse {
  id: number
  pedidoId: number
  tipoComprobante: string
  metodoPago: string
  subtotal: number
  igv: number
  total: number
  estado: string
  pagadoEn: string
}

export const cajaApi = {
  getPedidosActivos: () => api.get<{ data: PedidoResumen[] }>('/api/caja/pedidos'),
  emitirComprobante: (req: EmitirComprobanteRequest) =>
    api.post<{ data: ComprobanteResponse }>('/api/caja/comprobante', req),
}
