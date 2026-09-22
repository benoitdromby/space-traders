import { createRouter, createWebHistory, type RouterHistory } from 'vue-router'

import { useAuthStore } from '@/features/auth/stores/authStore'
import { useFleetStore } from '@/features/fleet/stores/fleetStore'

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
        // The selected ship lives in the URL, not just in memory: this is the only screen once
        // connected, so a ship is always selected and always addressable/shareable/bookmarkable.
        path: '/ship/:symbol',
        name: 'ship',
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

  /** Loads the fleet if needed and returns the ship the app should fall back to, if any. */
  async function defaultShipSymbol(): Promise<string | null> {
    const fleet = useFleetStore()
    if (!fleet.selectedShip) await fleet.load(1)
    return fleet.selectedShip?.symbol ?? null
  }

  router.beforeEach(async (to) => {
    const auth = useAuthStore()

    // Page load with a stored token: resume the session before deciding where to go.
    if (auth.hasToken && !auth.isConnected) await auth.restore()

    if (to.meta.requiresAuth && !auth.isConnected) return { name: 'splash' }

    // Connected and at the splash page (fresh login, or a stored session resuming here): go to
    // whichever ship is already selected, or the first one if none is yet.
    if (to.name === 'splash' && auth.isConnected) {
      const symbol = await defaultShipSymbol()
      return symbol ? { name: 'ship', params: { symbol } } : true
    }

    // Keep the store's selection in sync with the URL: a click, a pasted link, and the
    // back/forward buttons all end up here.
    if (to.name === 'ship') {
      const requested = String(to.params.symbol)
      const fleet = useFleetStore()
      if (fleet.selectedShip?.symbol !== requested) {
        const found = await fleet.selectBySymbol(requested)
        if (!found) {
          // Unknown or stale symbol: fall back to a real ship instead of a dead-end page.
          const fallback = await defaultShipSymbol()
          if (fallback && fallback !== requested) {
            return { name: 'ship', params: { symbol: fallback }, replace: true }
          }
          // No ships at all: nothing sane to fall back to. Let it render; the panels already
          // handle an empty fleet.
        }
      }
    }

    return true
  })

  return router
}

export default createAppRouter()
