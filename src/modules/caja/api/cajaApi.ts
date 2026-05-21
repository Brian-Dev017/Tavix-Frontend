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
  items: PedidoItem[]
}

export interface PedidoItem {
  detalleId: number
  pedidoId: number
  productoId: number
  productoNombre: string
  cantidad: number
  precio: number
  subtotal: number
  estado: string
  observaciones: string | null
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
  descuento?: number
  motivoDescuento?: string
  efectivoRecibido?: number
}

export interface ComprobanteResponse {
  id: number
  pedidoId: number
  tipoComprobante: string
  serie: string
  numero: number
  metodoPago: string
  tipoComprobanteNombre: string
  subtotal: number
  igv: number
  descuento: number
  total: number
  efectivoRecibido: number | null
  vuelto: number
  estado: string
  pagadoEn: string
}

export const cajaApi = {
  getPedidosActivos: () => api.get<{ data: PedidoResumen[] }>('/api/caja/pedidos'),
  emitirComprobante: (req: EmitirComprobanteRequest) =>
    api.post<{ data: ComprobanteResponse }>('/api/caja/comprobante', req),
  descargarEscPos: (id: number) =>
    api.get(`/api/caja/comprobante/${id}/escpos`, { responseType: 'blob' }),
}
