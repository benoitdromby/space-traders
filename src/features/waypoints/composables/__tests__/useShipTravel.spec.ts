import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick, ref } from 'vue'

import { InsufficientFuelError } from '@/features/fleet/api/fleetApi'
import { useFleetStore } from '@/features/fleet/stores/fleetStore'
import { useShipTravel } from '@/features/waypoints/composables/useShipTravel'

import { makeShip } from '@/features/fleet/__tests__/fixtures'

describe('useShipTravel', () => {
  beforeEach(() => setActivePinia(createPinia()))
  afterEach(() => vi.restoreAllMocks())

  it('does nothing when there is no ship', async () => {
    const fleet = useFleetStore()
    const navigateShip = vi.spyOn(fleet, 'navigateShip')
    const { travelTo } = useShipTravel(ref(null))

    await travelTo('X1-XZ48-A2')

    expect(navigateShip).not.toHaveBeenCalled()
  })

  it('sends the ship and tracks the pending state around the call', async () => {
    const fleet = useFleetStore()
    let resolveNavigate!: () => void
    vi.spyOn(fleet, 'navigateShip').mockReturnValue(
      new Promise((resolve) => (resolveNavigate = () => resolve(undefined))),
    )
    const { travelPending, travelTo } = useShipTravel(ref(makeShip(1)))

    const promise = travelTo('X1-XZ48-A2')
    expect(travelPending.value).toBe(true)
    resolveNavigate()
    await promise

    expect(travelPending.value).toBe(false)
    expect(fleet.navigateShip).toHaveBeenCalledWith('LEO-1', 'X1-XZ48-A2')
  })

  it('ignores an overlapping call while one is already in flight', async () => {
    const fleet = useFleetStore()
    const navigateShip = vi.spyOn(fleet, 'navigateShip').mockResolvedValue(undefined)
    const { travelTo } = useShipTravel(ref(makeShip(1)))

    const first = travelTo('X1-XZ48-A2')
    const second = travelTo('X1-XZ48-B3') // fired before the first has resolved
    await Promise.all([first, second])

    expect(navigateShip).toHaveBeenCalledOnce()
  })

  it('captures the fuel shortfall from InsufficientFuelError, leaving travelFailed unset', async () => {
    const fleet = useFleetStore()
    vi.spyOn(fleet, 'navigateShip').mockRejectedValue(new InsufficientFuelError(500, 300))
    const { travelError, travelFailed, travelTo } = useShipTravel(ref(makeShip(1)))

    await travelTo('X1-XZ48-A2')

    expect(travelError.value).toEqual({
      waypoint: 'X1-XZ48-A2',
      fuelRequired: 500,
      fuelAvailable: 300,
    })
    expect(travelFailed.value).toBe(false)
  })

  it('flags travelFailed for any other error, leaving travelError unset', async () => {
    const fleet = useFleetStore()
    vi.spyOn(fleet, 'navigateShip').mockRejectedValue(new Error('network blip'))
    const { travelError, travelFailed, travelTo } = useShipTravel(ref(makeShip(1)))

    await travelTo('X1-XZ48-A2')

    expect(travelFailed.value).toBe(true)
    expect(travelError.value).toBeNull()
  })

  it('clears a previous error as soon as a new attempt starts', async () => {
    const fleet = useFleetStore()
    const navigateShip = vi.spyOn(fleet, 'navigateShip')
    navigateShip.mockRejectedValueOnce(new Error('first attempt fails'))
    const { travelError, travelFailed, travelTo } = useShipTravel(ref(makeShip(1)))

    await travelTo('X1-XZ48-A2')
    expect(travelFailed.value).toBe(true)

    navigateShip.mockResolvedValueOnce(undefined)
    await travelTo('X1-XZ48-A2')

    expect(travelFailed.value).toBe(false)
    expect(travelError.value).toBeNull()
  })

  it('resets any error once the ship changes', async () => {
    const fleet = useFleetStore()
    vi.spyOn(fleet, 'navigateShip').mockRejectedValue(new Error('boom'))
    const ship = ref(makeShip(1))
    const { travelFailed, travelTo } = useShipTravel(ship)

    await travelTo('X1-XZ48-A2')
    expect(travelFailed.value).toBe(true)

    ship.value = makeShip(2)
    await nextTick() // let the watcher's job flush

    expect(travelFailed.value).toBe(false)
  })
})
