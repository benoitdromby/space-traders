import { vi } from 'vitest'

import { AGENT } from '@/__tests__/helpers'
import type { Ship } from '@/features/fleet/types/ship'

export function makeShip(n: number, overrides: Partial<Ship> = {}): Ship {
  return {
    symbol: `LEO-${n}`,
    nav: {
      systemSymbol: 'X1-XZ48',
      waypointSymbol: 'X1-XZ48-A1',
      status: 'DOCKED',
      flightMode: 'CRUISE',
    },
    frame: { symbol: 'FRAME_FRIGATE', name: 'Frigate' },
    cargo: { units: 10, capacity: 40 },
    fuel: { current: 300, capacity: 400 },
    ...overrides,
  }
}

export function makeFleet(size: number): Ship[] {
  return Array.from({ length: size }, (_, i) => makeShip(i + 1))
}

/** Stubs `fetch` like `GET /my/ships`: honours `page` and `limit` and returns `meta.total`. */
export function mockShipsApi(fleet: Ship[]) {
  const stub = vi.fn().mockImplementation(async (input: string) => {
    const url = new URL(input)
    const page = Number(url.searchParams.get('page'))
    const limit = Number(url.searchParams.get('limit'))
    const data = fleet.slice((page - 1) * limit, page * limit)
    return new Response(JSON.stringify({ data, meta: { total: fleet.length, page, limit } }))
  })
  vi.stubGlobal('fetch', stub)
  return stub
}

/**
 * Stubs both `GET /my/agent` and `GET /my/ships`, for tests that drive the real router (its
 * guard authenticates before it looks at the fleet).
 */
export function mockAgentAndShipsApi(fleet: Ship[]) {
  const stub = vi.fn().mockImplementation(async (input: string) => {
    const url = new URL(input)
    if (url.pathname.endsWith('/my/agent')) {
      return new Response(JSON.stringify({ data: AGENT }))
    }
    const page = Number(url.searchParams.get('page'))
    const limit = Number(url.searchParams.get('limit'))
    const data = fleet.slice((page - 1) * limit, page * limit)
    return new Response(JSON.stringify({ data, meta: { total: fleet.length, page, limit } }))
  })
  vi.stubGlobal('fetch', stub)
  return stub
}

/**
 * Stubs `GET /my/ships` like `mockShipsApi`, plus `POST /my/ships/{symbol}/dock` and `.../orbit`:
 * flips that ship's status in `fleet` (so a later list refetch would see it too) and answers
 * with its new nav.
 */
export function mockFleetWithActions(fleet: Ship[]) {
  const stub = vi.fn().mockImplementation(async (input: string) => {
    const url = new URL(input)
    const action = url.pathname.match(/\/my\/ships\/([^/]+)\/(dock|orbit)$/)
    if (action) {
      const [, symbol, verb] = action
      const ship = fleet.find((s) => s.symbol === symbol)
      if (!ship)
        return new Response(JSON.stringify({ error: { message: 'not found' } }), { status: 404 })
      ship.nav.status = verb === 'dock' ? 'DOCKED' : 'IN_ORBIT'
      return new Response(JSON.stringify({ data: { nav: ship.nav } }))
    }
    const page = Number(url.searchParams.get('page'))
    const limit = Number(url.searchParams.get('limit'))
    const data = fleet.slice((page - 1) * limit, page * limit)
    return new Response(JSON.stringify({ data, meta: { total: fleet.length, page, limit } }))
  })
  vi.stubGlobal('fetch', stub)
  return stub
}

export function requestedPages(stub: ReturnType<typeof mockShipsApi>): number[] {
  return stub.mock.calls
    .map(([url]) => String(url))
    .filter((url) => url.includes('/my/ships'))
    .map((url) => Number(new URL(url).searchParams.get('page')))
}
