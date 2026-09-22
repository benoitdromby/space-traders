import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'

import { makeShip } from '@/features/fleet/__tests__/fixtures'
import type { Ship } from '@/features/fleet/types/ship'
import { useShipLocation } from '@/features/location/composables/useShipLocation'

function mockLocationApi() {
  const stub = vi.fn().mockImplementation(async (input: string) => {
    if (input.includes('/waypoints/')) {
      const [, waypointSymbol] = input.match(/waypoints\/([^/?]+)/)!
      return new Response(
        JSON.stringify({
          data: {
            symbol: waypointSymbol,
            type: 'PLANET',
            faction: { symbol: 'GALACTIC' },
            traits: [
              { symbol: 'MARKETPLACE', name: 'Marketplace' },
              { symbol: 'BARREN', name: 'Barren' },
            ],
          },
        }),
      )
    }
    const [, systemSymbol] = input.match(/systems\/([^/?]+)/)!
    return new Response(
      JSON.stringify({
        data: { symbol: systemSymbol, type: 'RED_STAR', x: 12, y: -8, waypoints: [1, 2, 3] },
      }),
    )
  })
  vi.stubGlobal('fetch', stub)
  return stub
}

describe('useShipLocation', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('does nothing when there is no ship', () => {
    const stub = mockLocationApi()
    const { system, waypoint, status } = useShipLocation(ref(null))

    expect(stub).not.toHaveBeenCalled()
    expect(system.value).toBeNull()
    expect(waypoint.value).toBeNull()
    expect(status.value).toBe('idle')
  })

  it('fetches the system and waypoint of the given ship', async () => {
    mockLocationApi()
    const ship = ref(makeShip(1))
    const { system, waypoint, status } = useShipLocation(ship)

    expect(status.value).toBe('loading')
    await vi.waitFor(() => expect(status.value).toBe('idle'))

    expect(system.value).toEqual({
      symbol: 'X1-XZ48',
      type: 'RED_STAR',
      x: 12,
      y: -8,
      waypointCount: 3,
    })
    expect(waypoint.value).toEqual({
      symbol: 'X1-XZ48-A1',
      type: 'PLANET',
      faction: 'GALACTIC',
      hasMarketplace: true,
    })
  })

  it('refetches when the ship moves to a new waypoint', async () => {
    const stub = mockLocationApi()
    const ship = ref(makeShip(1))
    const { waypoint, status } = useShipLocation(ship)
    await vi.waitFor(() => expect(status.value).toBe('idle'))
    stub.mockClear()

    ship.value = makeShip(1, {
      nav: { ...makeShip(1).nav, waypointSymbol: 'X1-XZ48-B2' },
    })
    await nextTick() // lets the watcher fire before we wait for it to settle back to idle
    await vi.waitFor(() => expect(status.value).toBe('idle'))

    expect(waypoint.value?.symbol).toBe('X1-XZ48-B2')
    expect(stub).toHaveBeenCalled()
  })

  it('does not refetch when the ship reference changes but its location does not', async () => {
    const stub = mockLocationApi()
    const ship = ref(makeShip(1))
    const { status } = useShipLocation(ship)
    await vi.waitFor(() => expect(status.value).toBe('idle'))
    stub.mockClear()

    ship.value = makeShip(1) // same system/waypoint, new object
    await Promise.resolve()

    expect(stub).not.toHaveBeenCalled()
  })

  it('reports an error and can retry', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 500 })))
    const ship = ref(makeShip(1))
    const { status, retry } = useShipLocation(ship)
    await vi.waitFor(() => expect(status.value).toBe('error'))

    mockLocationApi()
    retry()
    await vi.waitFor(() => expect(status.value).toBe('idle'))
  })

  it('clears everything when the ship becomes null', async () => {
    mockLocationApi()
    const ship = ref<Ship | null>(makeShip(1))
    const { system, waypoint, status } = useShipLocation(ship)
    await vi.waitFor(() => expect(status.value).toBe('idle'))

    ship.value = null
    await nextTick()

    expect(system.value).toBeNull()
    expect(waypoint.value).toBeNull()
  })
})
