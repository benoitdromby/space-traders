import { createRouter, createWebHistory, type RouterHistory } from 'vue-router'

import { useAuthStore } from '@/features/auth/stores/authStore'

declare module 'vue-router' {
  interface RouteMeta {
    /** The route needs a connected agent; otherwise the user is sent to the splash page. */
    requiresAuth?: boolean
  }
}

export function createAppRouter(
  // BASE_URL follows the `base` option in vite.config.ts (e.g. "/space-traders/" on GitHub Pages).
  history: RouterHistory = createWebHistory(import.meta.env.BASE_URL),
) {
  const router = createRouter({
    history,
    routes: [
      {
        path: '/',
        name: 'splash',
        component: () => import('@/features/auth/views/SplashView.vue'),
      },
      {
        path: '/dashboard',
        name: 'dashboard',
        component: () => import('@/features/dashboard/views/DashboardView.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: '/:pathMatch(.*)*',
        name: 'not-found',
        component: () => import('@/views/NotFoundView.vue'),
      },
    ],
  })

  router.beforeEach(async (to) => {
    const auth = useAuthStore()

    // Page load with a stored token: resume the session before deciding where to go.
    if (auth.hasToken && !auth.isConnected) await auth.restore()

    if (to.meta.requiresAuth && !auth.isConnected) return { name: 'splash' }
    if (to.name === 'splash' && auth.isConnected) return { name: 'dashboard' }
    return true
  })

  return router
}

export default createAppRouter()
