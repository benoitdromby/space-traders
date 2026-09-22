import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'

import { useAuthStore } from '@/features/auth/stores/authStore'

import { dockShip, fetchShips, orbitShip } from '@/features/fleet/api/fleetApi'
import type { Ship } from '@/features/fleet/types/ship'

/** Ships per page. Pagination is only shown when the fleet is larger than this. */
export const PAGE_SIZE = 3

export const useFleetStore = defineStore('fleet', () => {
  const ships = ref<Ship[]>([])
  const total = ref(0)
  const page = ref(1)
  const status = ref<'idle' | 'loading' | 'error'>('idle')
  /** True once a page has been fetched successfully: tells "not loaded yet" from "empty fleet". */
  const loaded = ref(false)
  // The full record, not just its symbol: other features (e.g. the location panel) need its
  // nav data, and the selected ship isn't always on the page currently displayed.
  const selectedShip = ref<Ship | null>(null)
  const selectedSymbol = computed(() => selectedShip.value?.symbol ?? null)

  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))
  const showPagination = computed(() => total.value > PAGE_SIZE)

  let controller: AbortController | null = null

  /** Loads one page of ships. A newer call cancels the one still in flight. */
  async function load(targetPage = page.value) {
    controller?.abort()
    controller = new AbortController()
    const { signal } = controller

    page.value = targetPage
    status.value = 'loading'
    try {
      const result = await fetchShips({ page: targetPage, limit: PAGE_SIZE, signal })
      ships.value = result.ships
      total.value = result.total
      selectedShip.value ??= result.ships[0] ?? null
      loaded.value = true
      status.value = 'idle'
    } catch {
      // A cancelled request is superseded by a newer one, which owns the status.
      if (!signal.aborted) status.value = 'error'
    }
  }

  /**
   * Selects the ship with this symbol, whatever page it's on. This is the only place selection
   * changes: the router calls it to keep the store in sync with the "/ship/:symbol" URL,
   * whether that's a click, a pasted link, or the back/forward buttons.
   *
   * Returns false if no ship has that symbol (an unknown or stale URL).
   */
  async function selectBySymbol(symbol: string): Promise<boolean> {
    // Fast path: already on the page currently displayed, no request needed.
    const onCurrentPage = ships.value.find((s) => s.symbol === symbol)
    if (onCurrentPage) {
      selectedShip.value = onCurrentPage
      return true
    }

    // Slow path (a direct/pasted URL, or navigating to a ship on a page not currently shown):
    // scan pages from the start until the ship turns up. Reuses the same paginated endpoint
    // normal browsing already calls, so it costs one request per page up to the ship's own.
    controller?.abort()
    controller = new AbortController()
    const { signal } = controller

    status.value = 'loading'
    try {
      for (let candidatePage = 1; ; candidatePage++) {
        const result = await fetchShips({ page: candidatePage, limit: PAGE_SIZE, signal })
        const match = result.ships.find((s) => s.symbol === symbol)
        if (match) {
          ships.value = result.ships
          total.value = result.total
          page.value = candidatePage
          selectedShip.value = match
          loaded.value = true
          status.value = 'idle'
          return true
        }
        if (candidatePage * PAGE_SIZE >= result.total) {
          total.value = result.total
          loaded.value = true
          status.value = 'idle'
          return false
        }
      }
    } catch {
      if (!signal.aborted) status.value = 'error'
      return false
    }
  }

  /**
   * Switches a docked ship to orbit, or an orbiting one to dock. A no-op while it's in transit
   * (there's nowhere to send that request). Throws on failure — this is a per-ship action, not a
   * fleet-wide one, so it doesn't touch `status`; the caller decides how to show that error.
   */
  async function toggleDocking(symbol: string): Promise<void> {
    const ship = ships.value.find((s) => s.symbol === symbol)
    if (!ship || ship.nav.status === 'IN_TRANSIT') return

    const nextStatus = await (ship.nav.status === 'DOCKED' ? orbitShip(symbol) : dockShip(symbol))
    ship.nav.status = nextStatus
    // Normally the same object as `ship` already (selection always points into `ships`), but
    // set it explicitly rather than lean on that being true forever.
    if (selectedShip.value?.symbol === symbol) selectedShip.value.nav.status = nextStatus
  }

  function reset() {
    controller?.abort()
    ships.value = []
    total.value = 0
    page.value = 1
    status.value = 'idle'
    loaded.value = false
    selectedShip.value = null
  }

  // Never show one agent's ships to the next: drop everything when the session ends.
  const auth = useAuthStore()
  watch(
    () => auth.isConnected,
    (connected) => {
      if (!connected) reset()
    },
  )

  return {
    ships,
    total,
    page,
    status,
    loaded,
    selectedShip,
    selectedSymbol,
    totalPages,
    showPagination,
    load,
    selectBySymbol,
    toggleDocking,
  }
})
