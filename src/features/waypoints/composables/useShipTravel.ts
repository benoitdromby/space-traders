import { ref, watch, type Ref } from 'vue'

import { InsufficientFuelError } from '@/features/fleet/api/fleetApi'
import { useFleetStore } from '@/features/fleet/stores/fleetStore'
import type { Ship } from '@/features/fleet/types/ship'

export interface TravelFuelError {
  waypoint: string
  fuelRequired: number
  fuelAvailable: number
}

/**
 * Sends `ship` travelling to a waypoint, tracking the in-flight/error state of that one action.
 * Deliberately separate from `useWaypoints`: this is about *acting* on the ship, not about the
 * list of waypoints itself, and the two share no state.
 */
export function useShipTravel(ship: Ref<Ship | null>) {
  const fleet = useFleetStore()

  const travelPending = ref(false)
  const travelError = ref<TravelFuelError | null>(null)
  const travelFailed = ref(false)

  // A leftover error from a previous ship shouldn't linger once a different one is selected.
  watch(
    () => ship.value?.symbol,
    () => {
      travelError.value = null
      travelFailed.value = false
    },
  )

  async function travelTo(waypointSymbol: string) {
    if (!ship.value || travelPending.value) return
    travelError.value = null
    travelFailed.value = false
    travelPending.value = true
    try {
      await fleet.navigateShip(ship.value.symbol, waypointSymbol)
    } catch (error) {
      if (error instanceof InsufficientFuelError) {
        travelError.value = {
          waypoint: waypointSymbol,
          fuelRequired: error.fuelRequired,
          fuelAvailable: error.fuelAvailable,
        }
      } else {
        travelFailed.value = true
      }
    } finally {
      travelPending.value = false
    }
  }

  return { travelPending, travelError, travelFailed, travelTo }
}
