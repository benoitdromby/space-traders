import { http, HttpResponse } from 'msw'

import {
  apiError,
  makeMockFleet,
  makeMockMarket,
  makeMockShip,
  makeMockWaypointDetail,
  makeMockWaypoints,
  MOCK_AGENT,
  MOCK_SYSTEM,
} from '@/mocks/data'

// Every handler matches with a "*" origin prefix: they work whatever VITE_API_BASE_URL resolves
// to, without hardcoding it here too.
const PAGE_LIMIT = 20

/** `GET /my/agent` — the session used throughout the app once "connected". */
export function agentHandler(agent: Record<string, unknown> = MOCK_AGENT) {
  return http.get('*/my/agent', () => HttpResponse.json({ data: agent }))
}

/** `GET /my/agent` failing — for SplashView's error states. */
export function agentErrorHandler(status: number, message: string) {
  return http.get('*/my/agent', () => HttpResponse.json(apiError(message), { status }))
}

/**
 * The fleet, plus every per-ship action (dock/orbit/flight-mode/navigate) and the single-ship
 * endpoint — everything `fleetStore` calls. Mutates `ships` in place, so a later list refetch (or
 * single-ship fetch) sees the change too, matching `mockFleetWithActions` in the Vitest fixtures.
 */
export function fleetHandlers(ships: ReturnType<typeof makeMockShip>[] = makeMockFleet()) {
  return [
    http.get('*/my/ships/:symbol', ({ params }) => {
      const ship = ships.find((s) => s.symbol === params.symbol)
      if (!ship) return HttpResponse.json(apiError('not found'), { status: 404 })
      return HttpResponse.json({ data: ship })
    }),
    http.get('*/my/ships', ({ request }) => {
      const url = new URL(request.url)
      const page = Number(url.searchParams.get('page') ?? 1)
      const limit = Number(url.searchParams.get('limit') ?? PAGE_LIMIT)
      const data = ships.slice((page - 1) * limit, page * limit)
      return HttpResponse.json({ data, meta: { total: ships.length, page, limit } })
    }),
    http.post('*/my/ships/:symbol/dock', ({ params }) => {
      const ship = ships.find((s) => s.symbol === params.symbol)
      if (!ship) return HttpResponse.json(apiError('not found'), { status: 404 })
      ship.nav.status = 'DOCKED'
      return HttpResponse.json({ data: { nav: ship.nav } })
    }),
    http.post('*/my/ships/:symbol/orbit', ({ params }) => {
      const ship = ships.find((s) => s.symbol === params.symbol)
      if (!ship) return HttpResponse.json(apiError('not found'), { status: 404 })
      ship.nav.status = 'IN_ORBIT'
      return HttpResponse.json({ data: { nav: ship.nav } })
    }),
    http.patch('*/my/ships/:symbol/nav', async ({ params, request }) => {
      const ship = ships.find((s) => s.symbol === params.symbol)
      if (!ship) return HttpResponse.json(apiError('not found'), { status: 404 })
      const { flightMode } = (await request.json()) as { flightMode: string }
      ship.nav.flightMode = flightMode as typeof ship.nav.flightMode
      return HttpResponse.json({ data: { nav: ship.nav, fuel: ship.fuel, events: [] } })
    }),
    http.post('*/my/ships/:symbol/navigate', async ({ params, request }) => {
      const ship = ships.find((s) => s.symbol === params.symbol)
      if (!ship) return HttpResponse.json(apiError('not found'), { status: 404 })
      const { waypointSymbol } = (await request.json()) as { waypointSymbol: string }
      ship.nav.status = 'IN_TRANSIT'
      ship.nav.waypointSymbol = waypointSymbol
      ship.nav.route = { arrival: '2099-01-01T00:00:00.000Z' }
      ship.fuel = { ...ship.fuel, current: Math.max(0, ship.fuel.current - 1) }
      return HttpResponse.json({ data: { nav: ship.nav, fuel: ship.fuel, events: [] } })
    }),
  ]
}

/** `POST /my/ships/:symbol/navigate` failing with "not enough fuel" — SpaceTraders error code 4203. */
export function insufficientFuelHandler(fuelRequired: number, fuelAvailable: number) {
  return http.post('*/my/ships/:symbol/navigate', () =>
    HttpResponse.json(apiError('Navigate request failed.', 4203, { fuelRequired, fuelAvailable }), {
      status: 400,
    }),
  )
}

/** A dock/orbit/flight-mode/navigate action failing for some other reason (network, server error, ...). */
export function shipActionErrorHandler(status = 500) {
  return http.all('*/my/ships/:symbol/*', () => HttpResponse.json(apiError('boom'), { status }))
}

/** `GET /systems/{system}` — the selected ship's stellar system. */
export function systemHandler(system: Record<string, unknown> = MOCK_SYSTEM) {
  return http.get('*/systems/:system', ({ params }) => {
    if (params.system !== system.symbol)
      return HttpResponse.json(apiError('not found'), { status: 404 })
    return HttpResponse.json({ data: system })
  })
}

/**
 * `GET /systems/{system}/waypoints/{waypoint}` — the one endpoint two different features read
 * differently from: `useShipLocation` wants type/faction/traits, `useWaypoints` wants x/y for the
 * ship's own coordinates. The real API returns every field at once, so this does too, rather than
 * registering two competing handlers on the same route for a combined story to silently pick
 * between.
 */
export function waypointDetailHandler(
  systemSymbol: string,
  waypointSymbol: string,
  detail: ReturnType<typeof makeMockWaypointDetail> = makeMockWaypointDetail({
    symbol: waypointSymbol,
  }),
) {
  return http.get('*/systems/:system/waypoints/:waypoint', ({ params }) => {
    if (params.waypoint !== waypointSymbol || params.system !== systemSymbol) {
      return HttpResponse.json(apiError('not found'), { status: 404 })
    }
    return HttpResponse.json({ data: detail })
  })
}

/**
 * `GET /systems/{system}/waypoints` (the paginated list) and the single-waypoint endpoint above,
 * resolved for *any* symbol in `waypoints` — so the ship's own waypoint (looked up by
 * `useWaypoints` for its coordinates) always agrees with what the list itself shows.
 */
export function waypointsHandlers(
  systemSymbol: string,
  waypoints: ReturnType<typeof makeMockWaypoints> = makeMockWaypoints(12),
) {
  return [
    http.get('*/systems/:system/waypoints/:waypoint', ({ params }) => {
      const waypoint = waypoints.find((w) => w.symbol === params.waypoint)
      if (!waypoint || params.system !== systemSymbol) {
        return HttpResponse.json(apiError('not found'), { status: 404 })
      }
      return HttpResponse.json({
        data: makeMockWaypointDetail({
          symbol: waypoint.symbol,
          type: waypoint.type,
          x: waypoint.x,
          y: waypoint.y,
          faction: waypoint.faction.symbol,
          hasMarketplace: waypoint.hasMarketplace,
        }),
      })
    }),
    http.get('*/systems/:system/waypoints', ({ request, params }) => {
      if (params.system !== systemSymbol)
        return HttpResponse.json(apiError('not found'), { status: 404 })
      const url = new URL(request.url)
      const page = Number(url.searchParams.get('page') ?? 1)
      const limit = Number(url.searchParams.get('limit') ?? PAGE_LIMIT)
      // The real list endpoint doesn't send trait/marketplace info — only the single-waypoint
      // endpoint above does — so that internal-only field is stripped here to match its shape.
      const data = waypoints
        .slice((page - 1) * limit, page * limit)
        .map(({ symbol, type, x, y, faction }) => ({ symbol, type, x, y, faction }))
      return HttpResponse.json({ data, meta: { total: waypoints.length, page, limit } })
    }),
  ]
}

/**
 * `GET /systems/{system}/waypoints/{waypoint}/market` — trade goods only present once a ship is
 * there (pass `null` for a market with no ship present yet, matching the real API).
 */
export function marketHandler(
  systemSymbol: string,
  waypointSymbol: string,
  tradeGoods: ReturnType<typeof makeMockMarket> | null = makeMockMarket(),
) {
  return http.get('*/systems/:system/waypoints/:waypoint/market', ({ params }) => {
    if (params.waypoint !== waypointSymbol || params.system !== systemSymbol) {
      return HttpResponse.json(apiError('not found'), { status: 404 })
    }
    return HttpResponse.json({
      data: {
        symbol: waypointSymbol,
        exports: [],
        imports: [],
        exchange: [],
        ...(tradeGoods ? { tradeGoods } : {}),
      },
    })
  })
}

export function marketErrorHandler(status = 500) {
  return http.get('*/systems/:system/waypoints/:waypoint/market', () =>
    HttpResponse.json(apiError('boom'), { status }),
  )
}

/**
 * The "happy path" for the whole app: a connected agent, its fleet, the fleet's home system and
 * waypoints, and that system's market — everything a story needs by default so most stories work
 * without specifying handlers of their own. Individual stories override just what they need to
 * demonstrate (an error, an edge case) via `parameters.msw.handlers`.
 */
export function defaultHandlers() {
  const ships = makeMockFleet()
  const waypoints = makeMockWaypoints(24)
  return [
    agentHandler(),
    ...fleetHandlers(ships),
    systemHandler(),
    ...waypointsHandlers('X1-XZ48', waypoints),
    marketHandler('X1-XZ48', 'X1-XZ48-A1'),
  ]
}
