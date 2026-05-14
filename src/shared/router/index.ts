import { createRouter, createWebHistory } from 'vue-router'
import { normalizeAuthRole, useAuthStore } from '@/modules/auth/store/authStore'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/modules/auth/views/LoginView.vue'),
      meta: { requiresGuest: true, title: 'Iniciar sesión' }
    },
    {
      path: '/mesas',
      name: 'mesas',
      component: () => import('@/modules/mesas/views/MesasView.vue'),
      meta: { requiresAuth: true, roles: ['AD', 'ME'], title: 'Mesas' }
    },
    {
      path: '/pedido/:sesionId',
      name: 'pedido',
      component: () => import('@/modules/pedidos/views/PedidoView.vue'),
      meta: { requiresAuth: true, roles: ['AD', 'ME'], title: 'Tomar pedido' }
    },
    {
      path: '/cocina',
      name: 'cocina',
      component: () => import('@/modules/cocina/views/CocinaView.vue'),
      meta: { requiresAuth: true, roles: ['AD', 'CO'], title: 'Cocina' }
    },
    {
      path: '/caja',
      name: 'caja',
      component: () => import('@/modules/caja/views/CajaView.vue'),
      meta: { requiresAuth: true, roles: ['AD', 'CA'], title: 'Caja' }
    },
    // ── Admin Panel (nested routes con sidebar) ──────────────
    {
      path: '/admin',
      component: () => import('@/modules/admin/views/AdminLayout.vue'),
      meta: { requiresAuth: true, roles: ['AD'] },
      children: [
        { path: '', redirect: '/admin/dashboard' },
        { path: 'dashboard', name: 'admin-dashboard', component: () => import('@/modules/admin/views/DashboardView.vue'), meta: { title: 'Dashboard' } },
        // Carta & Menú
        { path: 'productos', name: 'admin-productos', component: () => import('@/modules/admin/views/ProductosAdminView.vue'), meta: { title: 'Productos' } },
        { path: 'categorias', name: 'admin-categorias', component: () => import('@/modules/admin/views/CategoriasView.vue'), meta: { title: 'Categorías' } },
        // Operaciones
        { path: 'mesas', name: 'admin-mesas', component: () => import('@/modules/admin/views/MesasAdminView.vue'), meta: { title: 'Mesas' } },
        { path: 'usuarios', name: 'admin-usuarios', component: () => import('@/modules/admin/views/UsuariosView.vue'), meta: { title: 'Usuarios' } },
        // Facturación
        { path: 'caja', name: 'admin-caja', component: () => import('@/modules/admin/views/ArqueoView.vue'), meta: { title: 'Caja' } },
        { path: 'pagos', name: 'admin-pagos', component: () => import('@/modules/admin/views/PagosView.vue'), meta: { title: 'Pagos' } },
        { path: 'anulaciones', name: 'admin-anulaciones', component: () => import('@/modules/admin/views/AnulacionesView.vue'), meta: { title: 'Anulaciones' } },
        { path: 'igv-series', name: 'admin-igv', component: () => import('@/modules/admin/views/IgvSeriesView.vue'), meta: { title: 'IGV & Series' } },
        // Suministros
        { path: 'stock', name: 'admin-stock', component: () => import('@/modules/admin/views/StockView.vue'), meta: { title: 'Stock' } },
        { path: 'proveedores', name: 'admin-proveedores', component: () => import('@/modules/admin/views/ProveedoresView.vue'), meta: { title: 'Proveedores' } },
        // Reportes
        { path: 'ventas', name: 'admin-ventas', component: () => import('@/modules/admin/views/VentasView.vue'), meta: { title: 'Ventas' } },
        { path: 'historial', name: 'admin-historial', component: () => import('@/modules/admin/views/HistorialView.vue'), meta: { title: 'Historial' } },
        // Configuración
        { path: 'negocio', name: 'admin-negocio', component: () => import('@/modules/admin/views/NegocioView.vue'), meta: { title: 'Negocio' } },
        { path: 'impresoras', name: 'admin-impresoras', component: () => import('@/modules/admin/views/ImpresoresView.vue'), meta: { title: 'Impresoras' } },
      ]
    },
    {
      path: '/',
      redirect: () => {
        const auth = useAuthStore()
        return getRolDefaultRoute(auth.rol)
      }
    },
    // Catch-all: ruta desconocida → home del rol (solo si autenticado, si no → login)
    {
      path: '/:pathMatch(.*)*',
      redirect: () => {
        const auth = useAuthStore()
        if (!auth.isAuthenticated || !auth.rol) return '/login'
        return getRolDefaultRoute(auth.rol)
      }
    }
  ]
})

function getRolDefaultRoute(rol?: string): string {
  switch (normalizeAuthRole(rol)) {
    case 'ME': return '/mesas'
    case 'CO': return '/cocina'
    case 'CA': return '/caja'
    case 'AD': return '/admin'
    default:   return '/login'
  }
}

router.beforeEach((to, _from, next) => {
  const auth = useAuthStore()

  if (to.meta.requiresGuest && auth.isAuthenticated) {
    // Si hay token pero rol inválido/undefined → limpiar y mostrar login
    if (!auth.rol) {
      auth.logout()
      return next()
    }
    return next(getRolDefaultRoute(auth.rol))
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return next('/login')
  }

  const roles = to.meta.roles as string[] | undefined
  if (roles && auth.rol && !roles.includes(auth.rol)) {
    return next(getRolDefaultRoute(auth.rol))
  }

  next()
})

router.afterEach((to) => {
  const pageTitle = to.meta.title as string | undefined
  document.title = pageTitle ? `${pageTitle} — Tavix` : 'Tavix'
})

export default router
