import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'

import { makeShip } from '@/features/fleet/__tests__/fixtures'
import type { Ship } from '@/features/fleet/types/ship'
import { WAYPOINTS_PAGE_LIMIT } from '@/features/waypoints/api/waypointsApi'
import { useWaypoints } from '@/features/waypoints/composables/useWaypoints'

import {
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

  it('starts over when only the flight mode changes', async () => {
    const stub = mockWaypointsApi('X1-XZ48', makeWaypoints(3))
    const ship = ref(makeShip(1))
    const list = useWaypoints(ship)
    await vi.waitFor(() => expect(list.loaded.value).toBe(true))
    stub.mockClear()

    ship.value = makeShip(1, { nav: { ...makeShip(1).nav, flightMode: 'BURN' } })
    await nextTick()

    expect(list.loaded.value).toBe(false)
    await vi.waitFor(() => expect(list.loaded.value).toBe(true))
    expect(requestedWaypointPages(stub)).toEqual([1])
  })

  it('does not reload for changes unrelated to system or flight mode', async () => {
    const stub = mockWaypointsApi('X1-XZ48', makeWaypoints(3))
    const ship = ref(makeShip(1))
    const list = useWaypoints(ship)
    await vi.waitFor(() => expect(list.loaded.value).toBe(true))
    stub.mockClear()

    ship.value = makeShip(1, { cargo: { units: 30, capacity: 40 } })
    await nextTick()

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
})
