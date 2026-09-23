import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises } from '@vue/test-utils'

import { clearAuthToken } from '@/api/authToken'
import { ApiError } from '@/api/client'
import { AGENT, mockFetch } from '@/__tests__/helpers'
import { useAuthStore } from '@/features/auth/stores/authStore'

import { PAGE_SIZE, useFleetStore } from '@/features/fleet/stores/fleetStore'
import {
  makeFleet,
  makeShip,
  mockFleetWithActions,
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

    await fleet.load(2)
    expect(fleet.selectedSymbol).toBe('LEO-1')
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

  describe('selectBySymbol', () => {
    it('selects a ship already on the displayed page without a request', async () => {
      const fetchMock = mockShipsApi(makeFleet(3))
      const fleet = useFleetStore()
      await fleet.load()
      fetchMock.mockClear()

      await expect(fleet.selectBySymbol('LEO-3')).resolves.toBe(true)

      expect(fleet.selectedSymbol).toBe('LEO-3')
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('scans forward and lands on the page the ship is actually on', async () => {
      const fetchMock = mockShipsApi(makeFleet(7)) // 3 pages of 3, LEO-7 is on page 3
      const fleet = useFleetStore()

      await expect(fleet.selectBySymbol('LEO-7')).resolves.toBe(true)

      expect(fleet.selectedSymbol).toBe('LEO-7')
      expect(fleet.page).toBe(3)
      expect(fleet.ships.map((s) => s.symbol)).toEqual(['LEO-7'])
      expect(requestedPages(fetchMock)).toEqual([1, 2, 3])
    })

    it('stops scanning and reports failure once every page has been checked', async () => {
      const fetchMock = mockShipsApi(makeFleet(4))
      const fleet = useFleetStore()

      await expect(fleet.selectBySymbol('NOT-A-SHIP')).resolves.toBe(false)

      expect(fleet.selectedShip).toBeNull()
      expect(fleet.loaded).toBe(true)
      expect(requestedPages(fetchMock)).toEqual([1, 2])
    })

    it('resolves false immediately for an empty fleet, without looping', async () => {
      mockShipsApi([])
      const fleet = useFleetStore()

      await expect(fleet.selectBySymbol('LEO-1')).resolves.toBe(false)
      expect(fleet.loaded).toBe(true)
    })

    it('flags an error on network failure', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
      const fleet = useFleetStore()

      await expect(fleet.selectBySymbol('LEO-1')).resolves.toBe(false)
      expect(fleet.status).toBe('error')
    })
  })

  describe('toggleDocking', () => {
    it('sends a docked ship into orbit', async () => {
      const fleetData = makeFleet(1)
      mockFleetWithActions(fleetData)
      const fleet = useFleetStore()
      await fleet.load()

      await fleet.toggleDocking('LEO-1')

      expect(fleet.ships[0]!.nav.status).toBe('IN_ORBIT')
    })

    it('docks an orbiting ship', async () => {
      const fleetData = [makeShip(1, { nav: { ...makeShip(1).nav, status: 'IN_ORBIT' } })]
      mockFleetWithActions(fleetData)
      const fleet = useFleetStore()
      await fleet.load()

      await fleet.toggleDocking('LEO-1')

      expect(fleet.ships[0]!.nav.status).toBe('DOCKED')
    })

    it('updates the selected ship too, when it is the one toggled', async () => {
      mockFleetWithActions(makeFleet(1))
      const fleet = useFleetStore()
      await fleet.load()

      await fleet.toggleDocking('LEO-1')

      expect(fleet.selectedShip?.nav.status).toBe('IN_ORBIT')
    })

    it('does nothing for a ship in transit', async () => {
      const fleetData = [makeShip(1, { nav: { ...makeShip(1).nav, status: 'IN_TRANSIT' } })]
      const fetchMock = mockFleetWithActions(fleetData)
      const fleet = useFleetStore()
      await fleet.load()
      fetchMock.mockClear()

      await fleet.toggleDocking('LEO-1')

      expect(fleet.ships[0]!.nav.status).toBe('IN_TRANSIT')
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('does nothing for a ship that is not on the displayed page', async () => {
      const fetchMock = mockFleetWithActions(makeFleet(1))
      const fleet = useFleetStore()
      await fleet.load()
      fetchMock.mockClear()

      await fleet.toggleDocking('SOME-OTHER-SHIP')

      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('throws and leaves the status untouched on failure', async () => {
      mockShipsApi(makeFleet(1))
      const fleet = useFleetStore()
      await fleet.load()
      mockFetch(500, {})

      await expect(fleet.toggleDocking('LEO-1')).rejects.toBeInstanceOf(ApiError)
      expect(fleet.ships[0]!.nav.status).toBe('DOCKED')
    })
  })

  describe('changeFlightMode', () => {
    it('sets the flight mode', async () => {
      mockFleetWithActions(makeFleet(1)) // starts at CRUISE
      const fleet = useFleetStore()
      await fleet.load()

      await fleet.changeFlightMode('LEO-1', 'BURN')

      expect(fleet.ships[0]!.nav.flightMode).toBe('BURN')
    })

    it('updates the selected ship too, when it is the one changed', async () => {
      mockFleetWithActions(makeFleet(1))
      const fleet = useFleetStore()
      await fleet.load()

      await fleet.changeFlightMode('LEO-1', 'STEALTH')

      expect(fleet.selectedShip?.nav.flightMode).toBe('STEALTH')
    })

    it('works even while the ship is in transit, unlike toggleDocking', async () => {
      const fleetData = [makeShip(1, { nav: { ...makeShip(1).nav, status: 'IN_TRANSIT' } })]
      mockFleetWithActions(fleetData)
      const fleet = useFleetStore()
      await fleet.load()

      await fleet.changeFlightMode('LEO-1', 'DRIFT')

      expect(fleet.ships[0]!.nav.flightMode).toBe('DRIFT')
    })

    it('does nothing for a ship that is not on the displayed page', async () => {
      const fetchMock = mockFleetWithActions(makeFleet(1))
      const fleet = useFleetStore()
      await fleet.load()
      fetchMock.mockClear()

      await fleet.changeFlightMode('SOME-OTHER-SHIP', 'BURN')

      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('throws and leaves the mode untouched on failure', async () => {
      mockShipsApi(makeFleet(1))
      const fleet = useFleetStore()
      await fleet.load()
      mockFetch(500, {})

      await expect(fleet.changeFlightMode('LEO-1', 'BURN')).rejects.toBeInstanceOf(ApiError)
      expect(fleet.ships[0]!.nav.flightMode).toBe('CRUISE')
    })
  })
})
