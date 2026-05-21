import api from '@/shared/api/axiosInstance'

export interface ProductoDTO {
  id: number
  nombre: string
  descripcion: string
  precio: number
  imagenUrl: string
  disponible: boolean
}

export interface CategoriaConProductosDTO {
  id: number
  nombre: string
  productos: ProductoDTO[]
}

export const menuApi = {
  getMenu: () => api.get<{ data: CategoriaConProductosDTO[] }>('/api/menu')
}
