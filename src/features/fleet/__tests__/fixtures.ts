import { vi } from 'vitest'

import type { Ship } from '../types'

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

export function requestedPages(stub: ReturnType<typeof mockShipsApi>): number[] {
  return stub.mock.calls.map(([url]) => Number(new URL(url as string).searchParams.get('page')))
}
