import api from '@/shared/api/axiosInstance'

export interface UsuarioAdmin {
  id: number
  nombre: string
  apellido: string
  usuario: string
  rolId: 'AD' | 'ME' | 'CO' | 'CA'
  activo: boolean
}

export interface ProductoAdmin {
  id: number
  categoriaId: number
  categoriaNombre: string
  nombre: string
  descripcion: string | null
  precio: number
  imagenUrl: string | null
  disponible: boolean
}

export interface CrearUsuarioRequest {
  nombre: string
  apellido: string
  usuario: string
  contrasena: string
  rolId: string
}

export interface ActualizarUsuarioRequest {
  nombre?: string
  apellido?: string
  rolId?: string
  activo?: boolean
}

export interface GuardarProductoRequest {
  categoriaId: number
  nombre: string
  descripcion: string
  precio: number
  imagenUrl: string
  disponible: boolean
}

export interface CategoriaAdmin {
  id: number
  nombre: string
  descripcion: string | null
  activo: boolean
}

export interface GuardarCategoriaRequest {
  nombre: string
  descripcion: string
}

export interface MesaAdmin {
  id: number
  numero: string
  capacidad: number
  estado: 'DISPONIBLE' | 'OCUPADA' | 'RESERVADA' | 'INACTIVA'
}

export interface GuardarMesaRequest {
  numero: string
  capacidad: number
}

export const adminApi = {
  // Usuarios
  listarUsuarios: () => api.get<{ data: UsuarioAdmin[] }>('/api/admin/usuarios'),
  crearUsuario: (req: CrearUsuarioRequest) => api.post<{ data: UsuarioAdmin }>('/api/admin/usuarios', req),
  actualizarUsuario: (id: number, req: ActualizarUsuarioRequest) =>
    api.put<{ data: UsuarioAdmin }>(`/api/admin/usuarios/${id}`, req),
  resetPassword: (id: number, nuevaContrasena: string) =>
    api.patch(`/api/admin/usuarios/${id}/contrasena`, { nuevaContrasena }),
  eliminarUsuario: (id: number) => api.delete(`/api/admin/usuarios/${id}`),

  // Productos
  listarProductos: () => api.get<{ data: ProductoAdmin[] }>('/api/admin/productos'),
  crearProducto: (req: GuardarProductoRequest) => api.post<{ data: ProductoAdmin }>('/api/admin/productos', req),
  actualizarProducto: (id: number, req: GuardarProductoRequest) =>
    api.put<{ data: ProductoAdmin }>(`/api/admin/productos/${id}`, req),
  toggleDisponibilidad: (id: number) => api.patch(`/api/admin/productos/${id}/disponibilidad`, {}),
  eliminarProducto: (id: number) => api.delete(`/api/admin/productos/${id}`),

  // Categorías
  listarCategorias: () => api.get<{ data: CategoriaAdmin[] }>('/api/admin/categorias'),
  crearCategoria: (req: GuardarCategoriaRequest) => api.post<{ data: CategoriaAdmin }>('/api/admin/categorias', req),
  actualizarCategoria: (id: number, req: GuardarCategoriaRequest) =>
    api.put<{ data: CategoriaAdmin }>(`/api/admin/categorias/${id}`, req),
  eliminarCategoria: (id: number) => api.delete(`/api/admin/categorias/${id}`),

  // Mesas
  listarMesasAdmin: () => api.get<{ data: MesaAdmin[] }>('/api/admin/mesas'),
  crearMesa: (req: GuardarMesaRequest) => api.post<{ data: MesaAdmin }>('/api/admin/mesas', req),
  actualizarMesa: (id: number, req: GuardarMesaRequest) =>
    api.put<{ data: MesaAdmin }>(`/api/admin/mesas/${id}`, req),
  toggleEstadoMesa: (id: number) => api.patch<{ data: MesaAdmin }>(`/api/admin/mesas/${id}/estado`, {}),
  eliminarMesa: (id: number) => api.delete(`/api/admin/mesas/${id}`),
}
