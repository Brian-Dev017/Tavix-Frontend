import api from '@/shared/api/axiosInstance'

export interface ItemPedido {
  detalleId: number
  productoId: number
  productoNombre: string
  cantidad: number
  precio: number
  subtotal: number
  estado: string
  observaciones: string
}

export const pedidosApi = {
  crear: (sesionMesaId: number) =>
    api.post<{ data: { id: number } }>('/api/pedidos', { sesionMesaId }),

  crearParaLlevar: () =>
    api.post<{ data: { id: number } }>('/api/pedidos/para-llevar'),

  getDisponibilidadParaLlevar: () =>
    api.get<{ data: { disponible: boolean } }>('/api/pedidos/para-llevar/disponibilidad'),

  agregarItem: (pedidoId: number, productoId: number, cantidad: number, observaciones: string) =>
    api.post<{ data: ItemPedido }>(`/api/pedidos/${pedidoId}/items`, {
      productoId,
      cantidad,
      observaciones
    }),

  getItems: (pedidoId: number) =>
    api.get<{ data: ItemPedido[] }>(`/api/pedidos/${pedidoId}/items`)
}
