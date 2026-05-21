import api from '@/shared/api/axiosInstance'

export interface VentasPorDia {
  fecha: string
  total: number
  cantidad: number
}

export interface VentasPorMetodo {
  metodo: string
  total: number
  cantidad: number
}

export interface ReporteVentas {
  totalVentas: number
  cantidadComprobantes: number
  promedioVenta: number
  ventasPorDia: VentasPorDia[]
  ventasPorMetodo: VentasPorMetodo[]
}

export interface PlatoVendido {
  productoId: number
  nombre: string
  cantidad: number
}

export interface DashboardData {
  ventasHoy: number
  pedidosHoy: number
  ventasPorMetodo: VentasPorMetodo[]
  platosVendidos: PlatoVendido[]
}

export interface ComprobanteHistorial {
  id: number
  pedidoId: number
  tipoComprobante: string
  serie: string | null
  numero: number | null
  metodoPago: string
  total: number
  estado: string
  pagadoEn: string | null
  creadoEn: string
}

export interface HistorialDetalleItem {
  producto: string
  cantidad: number
  precio: number
  subtotal: number
  estado: string
  observaciones: string | null
}

export interface HistorialDetalle {
  comprobanteId: number
  pedidoId: number
  tipoComprobante: string
  serie: string
  numero: number
  metodoPago: string
  subtotal: number
  igv: number
  descuento: number
  total: number
  pagadoEn: string | null
  items: HistorialDetalleItem[]
}

export interface HistorialPage {
  content: ComprobanteHistorial[]
  totalElements: number
  totalPages: number
  number: number
}

export interface Arqueo {
  id: number
  cajeroId: number
  nombreCajero: string | null
  aperturaEn: string
  cierreEn: string | null
  montoApertura: number | null
  montoCierre: number | null
  totalVentas: number | null
  totalEfectivo: number | null
  totalDigital: number | null
  montoEsperado: number | null
  diferencia: number | null
  estado: 'ABIERTO' | 'CERRADO'
  notas: string | null
}

export const reportesApi = {
  getDashboard:   (desde?: string, hasta?: string) =>
    api.get<{ data: DashboardData }>('/api/reportes/dashboard', { params: { desde, hasta } }),
  getVentas:      (desde: string, hasta: string) =>
    api.get<{ data: ReporteVentas }>('/api/reportes/ventas', { params: { desde, hasta } }),
  getHistorial:   (page = 0, size = 20, estado?: string) =>
    api.get<{ data: HistorialPage }>('/api/reportes/historial', { params: { page, size, estado } }),
  getHistorialDetalle: (id: number) =>
    api.get<{ data: HistorialDetalle }>(`/api/reportes/historial/${id}/detalle`),

  // Arqueos
  listarArqueos:  () => api.get<{ data: Arqueo[] }>('/api/caja/arqueos'),
  getActivo:      () => api.get<{ data: Arqueo }>('/api/caja/arqueos/activo'),
  abrirArqueo:    (_cajeroId: number, montoApertura: number, notas?: string) =>
    api.post<{ data: Arqueo }>('/api/caja/arqueos/abrir', { montoApertura, notas }),
  registrarPrecierre: (id: number, montoEfectivo: number, notas?: string) =>
    api.post<{ data: Arqueo }>(`/api/caja/arqueos/${id}/precierre`, { montoEfectivo, notas }),
  cerrarArqueo:   (id: number, montoCierre: number, notas?: string) =>
    api.post<{ data: Arqueo }>(`/api/caja/arqueos/${id}/cerrar`, { montoCierre, notas }),
  getArqueoReporte: (id: number) =>
    api.get<{ data: unknown }>(`/api/caja/arqueos/${id}/reporte`),
}
