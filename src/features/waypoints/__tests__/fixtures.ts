import { vi } from 'vitest'

import { WAYPOINTS_PAGE_LIMIT } from '@/features/waypoints/api/waypointsApi'
import type { WaypointSummary } from '@/features/waypoints/types/waypoint'

export function makeWaypoint(n: number, overrides: Partial<WaypointSummary> = {}): WaypointSummary {
  return {
    symbol: `X1-XZ48-W${n}`,
    type: 'PLANET',
    x: n,
    y: n,
    faction: 'GALACTIC',
    ...overrides,
  }
}

export function makeWaypoints(count: number): WaypointSummary[] {
  return Array.from({ length: count }, (_, i) => makeWaypoint(i + 1))
}

/**
 * Stubs `GET /systems/{symbol}/waypoints` (honouring `page` and the API's own page limit) and
 * `GET /systems/{symbol}/waypoints/{waypoint}` (a single waypoint's coordinates, by symbol) —
 * everything `useWaypoints` calls.
 */
export function mockWaypointsApi(systemSymbol: string, waypoints: WaypointSummary[]) {
  const stub = vi.fn().mockImplementation(async (input: string) => {
    const url = new URL(input)

    const single = url.pathname.match(/\/systems\/[^/]+\/waypoints\/([^/]+)$/)
    if (single) {
      const [, symbol] = single
      const waypoint = waypoints.find((w) => w.symbol === symbol)
      if (!waypoint) {
        return new Response(JSON.stringify({ error: { message: 'not found' } }), { status: 404 })
      }
      return new Response(JSON.stringify({ data: { x: waypoint.x, y: waypoint.y } }))
    }

    const page = Number(url.searchParams.get('page'))
    const data = waypoints
      .slice((page - 1) * WAYPOINTS_PAGE_LIMIT, page * WAYPOINTS_PAGE_LIMIT)
      .map((wp) => ({
        symbol: wp.symbol,
        type: wp.type,
        x: wp.x,
        y: wp.y,
        faction: wp.faction ? { symbol: wp.faction } : undefined,
      }))
    return new Response(
      JSON.stringify({
        data,
        meta: { total: waypoints.length, page, limit: WAYPOINTS_PAGE_LIMIT },
      }),
    )
  })
  vi.stubGlobal('fetch', stub)
  return stub
}

export function requestedWaypointPages(stub: ReturnType<typeof mockWaypointsApi>): number[] {
  return stub.mock.calls
    .map(([url]) => String(url))
    .filter((url) => new URL(url).searchParams.has('page')) // excludes the single-waypoint fetch
    .map((url) => Number(new URL(url).searchParams.get('page')))
}
