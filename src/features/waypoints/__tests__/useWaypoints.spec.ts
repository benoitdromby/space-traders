import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'

import { makeShip } from '@/features/fleet/__tests__/fixtures'
import type { Ship } from '@/features/fleet/types/ship'
import { WAYPOINTS_PAGE_LIMIT } from '@/features/waypoints/api/waypointsApi'
import { useWaypoints } from '@/features/waypoints/composables/useWaypoints'

import {
  makeWaypoint,
  makeWaypoints,
  mockWaypointsApi,
  requestedWaypointPages,
} from '@/features/waypoints/__tests__/fixtures'

describe('useWaypoints', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('does nothing when there is no ship', () => {
    const stub = mockWaypointsApi('X1-XZ48', makeWaypoints(5))
    const { waypoints, total, loaded } = useWaypoints(ref(null))

    expect(stub).not.toHaveBeenCalled()
    expect(waypoints.value).toEqual([])
    expect(total.value).toBe(0)
    expect(loaded.value).toBe(false)
  })

  it('loads the first page as soon as a ship is set', async () => {
    const stub = mockWaypointsApi('X1-XZ48', makeWaypoints(5))
    const ship = ref(makeShip(1))
    const { waypoints, total, loaded, hasMore } = useWaypoints(ship)

    await vi.waitFor(() => expect(loaded.value).toBe(true))

    expect(total.value).toBe(5)
    expect(waypoints.value.map((w) => w.symbol)).toEqual([
      'X1-XZ48-W1',
      'X1-XZ48-W2',
      'X1-XZ48-W3',
      'X1-XZ48-W4',
      'X1-XZ48-W5',
    ])
    expect(hasMore.value).toBe(false) // only one page's worth exists
    expect(requestedWaypointPages(stub)).toEqual([1])
  })

  it('appends the next page on loadNextPage, in order', async () => {
    const stub = mockWaypointsApi('X1-XZ48', makeWaypoints(WAYPOINTS_PAGE_LIMIT + 5))
    const ship = ref(makeShip(1))
    const list = useWaypoints(ship)
    await vi.waitFor(() => expect(list.loaded.value).toBe(true))
    expect(list.hasMore.value).toBe(true)

    await list.loadNextPage()

    expect(list.waypoints.value).toHaveLength(WAYPOINTS_PAGE_LIMIT + 5)
    expect(list.waypoints.value[0]!.symbol).toBe('X1-XZ48-W1') // page 1 is still there, not replaced
    expect(list.waypoints.value[WAYPOINTS_PAGE_LIMIT]!.symbol).toBe(
      `X1-XZ48-W${WAYPOINTS_PAGE_LIMIT + 1}`,
    )
    expect(list.hasMore.value).toBe(false)
    expect(requestedWaypointPages(stub)).toEqual([1, 2])
  })

  it('does nothing once every page has already been loaded', async () => {
    const stub = mockWaypointsApi('X1-XZ48', makeWaypoints(3))
    const ship = ref(makeShip(1))
    const list = useWaypoints(ship)
    await vi.waitFor(() => expect(list.loaded.value).toBe(true))
    stub.mockClear()

    await list.loadNextPage()
    await list.loadNextPage()

    expect(stub).not.toHaveBeenCalled()
  })

  it('ignores an overlapping call while a page is already in flight', async () => {
    const stub = mockWaypointsApi('X1-XZ48', makeWaypoints(WAYPOINTS_PAGE_LIMIT * 2))
    const ship = ref(makeShip(1))
    const list = useWaypoints(ship)
    await vi.waitFor(() => expect(list.loaded.value).toBe(true))
    stub.mockClear()

    const first = list.loadNextPage()
    const second = list.loadNextPage() // fired before the first has resolved
    await Promise.all([first, second])

    expect(requestedWaypointPages(stub)).toEqual([2])
  })

  it('starts over when the ship changes', async () => {
    mockWaypointsApi('X1-XZ48', makeWaypoints(3))
    const ship = ref<Ship | null>(makeShip(1))
    const list = useWaypoints(ship)
    await vi.waitFor(() => expect(list.loaded.value).toBe(true))

    const otherStub = mockWaypointsApi('X1-YZ99', makeWaypoints(2))
    ship.value = makeShip(2, {
      nav: { ...makeShip(2).nav, systemSymbol: 'X1-YZ99', waypointSymbol: 'X1-YZ99-A1' },
    })
    await nextTick()

    expect(list.loaded.value).toBe(false) // reset immediately, not still showing the old system
    expect(list.waypoints.value).toEqual([])
    await vi.waitFor(() => expect(list.loaded.value).toBe(true))
    expect(list.total.value).toBe(2)
    expect(requestedWaypointPages(otherStub)).toEqual([1])
  })

  it('does not reload for changes within the same system, flight mode included', async () => {
    const stub = mockWaypointsApi('X1-XZ48', makeWaypoints(3))
    const ship = ref(makeShip(1))
    const list = useWaypoints(ship)
    await vi.waitFor(() => expect(list.loaded.value).toBe(true))
    stub.mockClear()

    ship.value = makeShip(1, { nav: { ...makeShip(1).nav, flightMode: 'BURN' } })
    await nextTick()
    ship.value = makeShip(1, { cargo: { units: 30, capacity: 40 } })
    await nextTick()

    expect(list.loaded.value).toBe(true)
    expect(list.waypoints.value).toHaveLength(3)
    expect(stub).not.toHaveBeenCalled()
  })

  it('flags loadError when the first page fails, with nothing to show', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 500 })))
    const ship = ref(makeShip(1))
    const list = useWaypoints(ship)

    await vi.waitFor(() => expect(list.loadError.value).toBe(true))
    expect(list.loaded.value).toBe(false)
  })

  it('flags moreError (not loadError) when a later page fails after the first succeeded', async () => {
    const ship = ref(makeShip(1))
    let calls = 0
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async () => {
        calls += 1
        if (calls === 1) {
          return new Response(
            JSON.stringify({
              data: [{ symbol: 'W1', type: 'PLANET', x: 0, y: 0, traits: [] }],
              meta: { total: 2, page: 1, limit: WAYPOINTS_PAGE_LIMIT },
            }),
          )
        }
        return new Response('{}', { status: 500 })
      }),
    )
    const list = useWaypoints(ship)
    await vi.waitFor(() => expect(list.loaded.value).toBe(true))

    await list.loadNextPage()

    expect(list.moreError.value).toBe(true)
    expect(list.loadError.value).toBe(false)
    expect(list.loaded.value).toBe(true) // page 1's content is still there
    expect(list.waypoints.value).toHaveLength(1)
  })

  it('sets loadingMore only for pages after the first', async () => {
    mockWaypointsApi('X1-XZ48', makeWaypoints(WAYPOINTS_PAGE_LIMIT + 1))
    const ship = ref(makeShip(1))
    const list = useWaypoints(ship)
    expect(list.loadingMore.value).toBe(false) // the *first* page doesn't count as "more"
    await vi.waitFor(() => expect(list.loaded.value).toBe(true))

    const promise = list.loadNextPage()
    expect(list.loadingMore.value).toBe(true)
    await promise
    expect(list.loadingMore.value).toBe(false)
  })

  it('retry re-requests whatever just failed', async () => {
    const ship = ref(makeShip(1))
    let fail = true
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async () => {
        if (fail) return new Response('{}', { status: 500 })
        return new Response(
          JSON.stringify({
            data: [{ symbol: 'W1', type: 'PLANET', x: 0, y: 0, traits: [] }],
            meta: { total: 1, page: 1, limit: WAYPOINTS_PAGE_LIMIT },
          }),
        )
      }),
    )
    const list = useWaypoints(ship)
    await vi.waitFor(() => expect(list.loadError.value).toBe(true))

    fail = false
    list.retry()
    await vi.waitFor(() => expect(list.loaded.value).toBe(true))
    expect(list.loadError.value).toBe(false)
  })

  describe('originCoordinates', () => {
    it("resolves to the ship's own waypoint coordinates", async () => {
      mockWaypointsApi('X1-XZ48', [
        makeWaypoint(1, { symbol: 'X1-XZ48-A1', x: 12, y: -8 }), // the ship's own waypoint by default
        makeWaypoint(2, { symbol: 'X1-XZ48-A2' }),
      ])
      const ship = ref(makeShip(1))
      const { originCoordinates } = useWaypoints(ship)

      await vi.waitFor(() => expect(originCoordinates.value).not.toBeNull())
      expect(originCoordinates.value).toEqual({ x: 12, y: -8 })
    })

    it('stays null while the ship has no fixed location to measure from (mid-transit)', async () => {
      mockWaypointsApi('X1-XZ48', [makeWaypoint(1, { symbol: 'X1-XZ48-A1' })])
      const ship = ref(makeShip(1, { nav: { ...makeShip(1).nav, status: 'IN_TRANSIT' } }))
      const { originCoordinates, loaded } = useWaypoints(ship)

      await vi.waitFor(() => expect(loaded.value).toBe(true))
      expect(originCoordinates.value).toBeNull()
    })

    it("re-fetches when just the ship's own waypoint changes — unlike the list itself", async () => {
      const stub = mockWaypointsApi('X1-XZ48', [
        makeWaypoint(1, { symbol: 'X1-XZ48-A1', x: 0, y: 0 }),
        makeWaypoint(2, { symbol: 'X1-XZ48-A2', x: 3, y: 4 }),
      ])
      const ship = ref(makeShip(1))
      const { originCoordinates, waypoints } = useWaypoints(ship)
      await vi.waitFor(() => expect(originCoordinates.value).toEqual({ x: 0, y: 0 }))
      stub.mockClear()

      ship.value = makeShip(1, { nav: { ...makeShip(1).nav, waypointSymbol: 'X1-XZ48-A2' } })
      await vi.waitFor(() => expect(originCoordinates.value).toEqual({ x: 3, y: 4 }))

      // Same system: the paginated list itself has no reason to reload.
      expect(waypoints.value).toHaveLength(2)
      expect(requestedWaypointPages(stub)).toEqual([])
    })

    it('falls back to null if the fetch for it fails', async () => {
      // The list loads fine, but the ship's own waypoint isn't in it (a stale/unknown symbol).
      mockWaypointsApi('X1-XZ48', [makeWaypoint(1, { symbol: 'X1-XZ48-OTHER' })])
      const ship = ref(makeShip(1)) // nav.waypointSymbol: X1-XZ48-A1, never mocked
      const { originCoordinates, loaded } = useWaypoints(ship)

      await vi.waitFor(() => expect(loaded.value).toBe(true))
      expect(originCoordinates.value).toBeNull()
    })
  })
})
