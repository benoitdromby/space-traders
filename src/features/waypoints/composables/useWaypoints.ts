import { computed, ref, watch, type Ref } from 'vue'

import type { Ship } from '@/features/fleet/types/ship'
import { fetchSystemWaypoints } from '@/features/waypoints/api/waypointsApi'
import type { WaypointSummary } from '@/features/waypoints/types/waypoint'

/**
 * Loads the waypoints of whichever system `ship` is currently in, one API page at a time,
 * appending each as `loadNextPage` is called — an infinite scroll, not a windowed/virtualised
 * list: everything loaded stays around, and the caller (typically an IntersectionObserver
 * watching a sentinel at the end of the list) decides when the user has scrolled far enough to
 * need the next page.
 *
 * Starts over whenever the ship (or just its flight mode) changes.
 */
export function useWaypoints(ship: Ref<Ship | null>) {
  const waypoints = ref<WaypointSummary[]>([])
  const total = ref(0)
  /** True once the first page has loaded for the current ship/system. */
  const loaded = ref(false)
  /** The first page itself failed: there is nothing to show at all. */
  const loadError = ref(false)
  /** A later page failed while earlier ones are still showing fine. */
  const moreError = ref(false)
  /** A page beyond the first is currently being fetched. */
  const loadingMore = ref(false)

  const hasMore = computed(() => waypoints.value.length < total.value)

  let currentSystem: string | null = null
  let nextPage = 1
  let inFlight = false

  async function loadNextPage() {
    // Once the first page has come back, `hasMore` is trustworthy; before that, total is still
    // unknown (0), so it must not block the very first call.
    if (!currentSystem || inFlight || (loaded.value && !hasMore.value)) return
    inFlight = true
    if (nextPage > 1) loadingMore.value = true
    const systemSymbol = currentSystem
    const page = nextPage
    try {
      const result = await fetchSystemWaypoints({ systemSymbol, page })
      if (systemSymbol !== currentSystem) return // superseded by a newer ship/system meanwhile

      total.value = result.total
      waypoints.value.push(...result.waypoints)
      nextPage = page + 1
      loaded.value = true
      loadError.value = false
      moreError.value = false
    } catch {
      if (systemSymbol !== currentSystem) return
      if (loaded.value) moreError.value = true
      else loadError.value = true
    } finally {
      inFlight = false
      loadingMore.value = false
    }
  }

  /** Retries whichever just failed — the first page, or the next one. */
  function retry() {
    loadError.value = false
    moreError.value = false
    void loadNextPage()
  }

  watch(
    () => (ship.value ? `${ship.value.nav.systemSymbol}|${ship.value.nav.flightMode}` : null),
    () => {
      currentSystem = ship.value?.nav.systemSymbol ?? null
      waypoints.value = []
      total.value = 0
      nextPage = 1
      loaded.value = false
      loadError.value = false
      moreError.value = false
      loadingMore.value = false
      if (currentSystem) void loadNextPage()
    },
    { immediate: true },
  )

  return {
    waypoints,
    total,
    loaded,
    loadError,
    moreError,
    loadingMore,
    hasMore,
    loadNextPage,
    retry,
  }
}
