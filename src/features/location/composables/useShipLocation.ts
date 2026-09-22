import { ref, watch, type Ref } from 'vue'

import type { Ship } from '@/features/fleet/types/ship'
import { fetchSystem, fetchWaypoint } from '@/features/location/api/locationApi'
import type { SystemSummary, WaypointDetail } from '@/features/location/types/location'

/**
 * Tracks the system and current waypoint of whichever ship `ship` points to, refetching
 * whenever the ship (or just its location) changes. Not a store: nothing outside the component
 * that owns this ship reference needs this data, so there is no reason for it to be global.
 */
export function useShipLocation(ship: Ref<Ship | null>) {
  const system = ref<SystemSummary | null>(null)
  const waypoint = ref<WaypointDetail | null>(null)
  const status = ref<'idle' | 'loading' | 'error'>('idle')

  let controller: AbortController | null = null

  async function load(systemSymbol: string, waypointSymbol: string) {
    controller?.abort()
    controller = new AbortController()
    const { signal } = controller

    status.value = 'loading'
    try {
      const [systemResult, waypointResult] = await Promise.all([
        fetchSystem(systemSymbol, signal),
        fetchWaypoint(systemSymbol, waypointSymbol, signal),
      ])
      system.value = systemResult
      waypoint.value = waypointResult
      status.value = 'idle'
    } catch {
      // A cancelled request is superseded by a newer one, which owns the status.
      if (!signal.aborted) status.value = 'error'
    }
  }

  watch(
    () => (ship.value ? `${ship.value.nav.systemSymbol}/${ship.value.nav.waypointSymbol}` : null),
    () => {
      if (ship.value) {
        void load(ship.value.nav.systemSymbol, ship.value.nav.waypointSymbol)
      } else {
        // No ship (e.g. an empty fleet, or the session ended): nothing left to show.
        controller?.abort()
        system.value = null
        waypoint.value = null
        status.value = 'idle'
      }
    },
    { immediate: true },
  )

  /** Retries the ship's current location after an error. */
  function retry() {
    if (ship.value) void load(ship.value.nav.systemSymbol, ship.value.nav.waypointSymbol)
  }

  return { system, waypoint, status, retry }
}
