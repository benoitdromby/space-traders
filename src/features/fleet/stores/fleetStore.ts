import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'

import { useAuthStore } from '@/features/auth/stores/authStore'

import {
  dockShip,
  fetchShip,
  fetchShips,
  navigateShip as apiNavigateShip,
  orbitShip,
  setFlightMode,
} from '@/features/fleet/api/fleetApi'
import type { FlightMode, Ship } from '@/features/fleet/types/ship'

/** Ships per page. Pagination is only shown when the fleet is larger than this. */
export const PAGE_SIZE = 3

// Extra time past a ship's `route.arrival` before re-checking it: the API only flips a ship's
// status over once something asks for it again after that instant, so asking right at it risks
// losing the race against clock skew and still seeing IN_TRANSIT.
const ARRIVAL_CHECK_BUFFER_MS = 300

// setTimeout silently fires almost immediately once its delay overflows a 32-bit signed int
// (~24.8 days) instead of actually waiting — clamp to just under that so a distant arrival still
// waits the maximum sane amount rather than firing right away.
const MAX_TIMER_DELAY_MS = 2_147_483_000

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
      watchInTransitShips(result.ships)
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
          watchInTransitShips(result.ships)
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

  /**
   * Sets a ship's flight mode. Unlike `toggleDocking`, there's no status this is unavailable
   * for — it works mid-transit too. Throws on failure, for the same reason `toggleDocking` does.
   */
  async function changeFlightMode(symbol: string, mode: FlightMode): Promise<void> {
    const ship = ships.value.find((s) => s.symbol === symbol)
    if (!ship) return

    const nextMode = await setFlightMode(symbol, mode)
    ship.nav.flightMode = nextMode
    if (selectedShip.value?.symbol === symbol) selectedShip.value.nav.flightMode = nextMode
  }

  function applyNav(symbol: string, nav: Ship['nav'], fuel?: Ship['fuel']) {
    const ship = ships.value.find((s) => s.symbol === symbol)
    if (ship) {
      ship.nav = nav
      if (fuel) ship.fuel = fuel
    }
    // Same defensive note as toggleDocking/changeFlightMode: usually the same object as `ship`
    // above already, but set explicitly rather than lean on that.
    if (selectedShip.value?.symbol === symbol) {
      selectedShip.value.nav = nav
      if (fuel) selectedShip.value.fuel = fuel
    }
  }

  const arrivalTimers = new Map<string, ReturnType<typeof setTimeout>>()

  function clearArrivalTimer(symbol: string) {
    const timer = arrivalTimers.get(symbol)
    if (timer !== undefined) {
      clearTimeout(timer)
      arrivalTimers.delete(symbol)
    }
  }

  /**
   * Schedules a one-off recheck of this ship just past its transit's `arrival` time. The API
   * doesn't push arrivals — a ship's status only flips from IN_TRANSIT once something asks for
   * it again after that instant — so this is what lets the UI notice on its own.
   */
  function scheduleArrivalCheck(symbol: string, arrivalIso: string) {
    clearArrivalTimer(symbol)
    const rawDelay =
      Math.max(0, new Date(arrivalIso).getTime() - Date.now()) + ARRIVAL_CHECK_BUFFER_MS
    const delay = Math.min(rawDelay, MAX_TIMER_DELAY_MS)
    arrivalTimers.set(
      symbol,
      setTimeout(() => {
        arrivalTimers.delete(symbol)
        void refreshAfterArrival(symbol)
      }, delay),
    )
  }

  async function refreshAfterArrival(symbol: string): Promise<void> {
    try {
      const fresh = await fetchShip(symbol)
      applyNav(symbol, fresh.nav, fresh.fuel)
    } catch {
      // Best-effort: the ship's card/travel action still reflect reality next time the user
      // interacts with it, or the page reloads — nothing here is safety-critical.
    }
  }

  /** Watches every already-in-transit ship in a freshly loaded page, not just ones just sent off
   * by `navigateShip` — e.g. a ship still travelling from before the app was last opened. */
  function watchInTransitShips(list: Ship[]) {
    for (const ship of list) {
      if (ship.nav.status === 'IN_TRANSIT')
        scheduleArrivalCheck(ship.symbol, ship.nav.route.arrival)
    }
  }

  /**
   * Sends an orbiting ship toward another waypoint in the same system. Throws
   * `InsufficientFuelError` if the trip costs more fuel than the ship is carrying, or `ApiError`
   * for any other failure — the caller decides how to show either. A no-op if the ship isn't in
   * orbit: there's nowhere to send that request from DOCKED or IN_TRANSIT.
   */
  async function navigateShip(symbol: string, waypointSymbol: string): Promise<void> {
    const ship = ships.value.find((s) => s.symbol === symbol)
    if (!ship || ship.nav.status !== 'IN_ORBIT') return

    const result = await apiNavigateShip(symbol, waypointSymbol)
    applyNav(symbol, result.nav, result.fuel)
    scheduleArrivalCheck(symbol, result.nav.route.arrival)
  }

  function reset() {
    controller?.abort()
    for (const timer of arrivalTimers.values()) clearTimeout(timer)
    arrivalTimers.clear()
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
    changeFlightMode,
    navigateShip,
  }
})
