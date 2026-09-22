import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises } from '@vue/test-utils'

import { clearAuthToken } from '@/api/authToken'
import { AGENT, mockFetch } from '@/__tests__/helpers'
import { useAuthStore } from '@/features/auth/stores/authStore'

import { PAGE_SIZE, useFleetStore } from '@/features/fleet/stores/fleetStore'
import {
  makeFleet,
  makeShip,
  mockShipsApi,
  requestedPages,
} from '@/features/fleet/__tests__/fixtures'

describe('fleet store', () => {
  beforeEach(() => {
    sessionStorage.clear()
    clearAuthToken()
    setActivePinia(createPinia())
  })
  afterEach(() => vi.unstubAllGlobals())

  it('loads the first page with the page size as limit', async () => {
    const fetchMock = mockShipsApi(makeFleet(2))
    const fleet = useFleetStore()

    await fleet.load()

    expect(fetchMock.mock.calls[0]![0]).toBe(
      `https://api.spacetraders.io/v2/my/ships?page=1&limit=${PAGE_SIZE}`,
    )
    expect(fleet.ships.map((s) => s.symbol)).toEqual(['LEO-1', 'LEO-2'])
    expect(fleet.total).toBe(2)
    expect(fleet.status).toBe('idle')
  })

  it('selects the first ship by default and keeps the selection across pages', async () => {
    mockShipsApi(makeFleet(7))
    const fleet = useFleetStore()

    await fleet.load(1)
    expect(fleet.selectedSymbol).toBe('LEO-1')

    fleet.select(makeShip(2))
    await fleet.load(2)
    expect(fleet.selectedSymbol).toBe('LEO-2')
  })

  it('exposes the full selected ship, not just its symbol', async () => {
    mockShipsApi(makeFleet(2))
    const fleet = useFleetStore()
    await fleet.load()

    expect(fleet.selectedShip?.symbol).toBe('LEO-1')

    const other = makeShip(9, { nav: { ...makeShip(9).nav, status: 'IN_TRANSIT' } })
    fleet.select(other)
    expect(fleet.selectedShip).toEqual(other)
  })

  it.each([
    [0, false],
    [PAGE_SIZE, false],
    [PAGE_SIZE + 1, true],
  ])('with %i ships, pagination visible: %s', async (size, visible) => {
    mockShipsApi(makeFleet(size))
    const fleet = useFleetStore()
    await fleet.load()
    expect(fleet.showPagination).toBe(visible)
  })

  it('computes the number of pages', async () => {
    mockShipsApi(makeFleet(7))
    const fleet = useFleetStore()
    await fleet.load()
    expect(fleet.totalPages).toBe(3)
  })

  it('flags an error and can retry the same page', async () => {
    mockFetch(500, {})
    const fleet = useFleetStore()
    await fleet.load(2)
    expect(fleet.status).toBe('error')
    expect(fleet.page).toBe(2)

    const retry = mockShipsApi(makeFleet(7))
    await fleet.load()
    expect(requestedPages(retry)).toEqual([2])
    expect(fleet.status).toBe('idle')
  })

  it('ignores a slow response that a newer request has replaced', async () => {
    const fleet = useFleetStore()
    const fleetData = makeFleet(7)
    // Page 1 answers late, page 2 answers immediately.
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (input: string, init: RequestInit) => {
        const page = Number(new URL(input).searchParams.get('page'))
        if (page === 1) {
          await new Promise((_, reject) =>
            init.signal!.addEventListener('abort', () =>
              reject(new DOMException('', 'AbortError')),
            ),
          )
        }
        const data = fleetData.slice((page - 1) * 3, page * 3)
        return new Response(JSON.stringify({ data, meta: { total: 7, page, limit: 3 } }))
      }),
    )

    const first = fleet.load(1)
    await fleet.load(2)
    await first

    expect(fleet.page).toBe(2)
    expect(fleet.ships[0]!.symbol).toBe('LEO-4')
    expect(fleet.status).toBe('idle')
  })

  it("forgets the ships when the agent's session ends", async () => {
    mockFetch(200, { data: AGENT })
    const auth = useAuthStore()
    await auth.connect('token')

    const fleet = useFleetStore()
    mockShipsApi(makeFleet(2))
    await fleet.load()
    expect(fleet.ships).toHaveLength(2)

    auth.disconnect()
    await flushPromises()

    expect(fleet.ships).toEqual([])
    expect(fleet.total).toBe(0)
    expect(fleet.selectedSymbol).toBeNull()
  })
})
