/**
 * Reusable mock data for the SpaceTraders API — shapes mirrored from the real responses (see the
 * project's own Vitest fixtures, e.g. `src/features/fleet/__tests__/fixtures.ts`, which were
 * built and checked against the live API throughout development). Used by the MSW handlers in
 * `handlers.ts`, and directly by stories that only need plain data (no network involved).
 */

export const MOCK_AGENT = {
  accountId: 'acc-1',
  symbol: 'LEO',
  headquarters: 'X1-XZ48-A1',
  credits: 175_000,
  startingFaction: 'GALACTIC',
  shipCount: 7,
}

export const MOCK_SYSTEM = {
  symbol: 'X1-XZ48',
  type: 'RED_STAR',
  x: 4517,
  y: 9498,
  waypoints: Array.from({ length: 92 }, (_, i) => ({ symbol: `X1-XZ48-W${i + 1}` })),
}

interface RawShipOverrides {
  symbol?: string
  waypointSymbol?: string
  status?: 'DOCKED' | 'IN_ORBIT' | 'IN_TRANSIT'
  flightMode?: 'CRUISE' | 'BURN' | 'DRIFT' | 'STEALTH'
  frame?: { symbol: string; name: string }
  cargo?: { units: number; capacity: number }
  fuel?: { current: number; capacity: number }
  arrival?: string
}

/** One ship, as `GET /my/ships` (and the single-ship endpoint) return it. */
export function makeMockShip(n: number, overrides: RawShipOverrides = {}) {
  return {
    symbol: overrides.symbol ?? `LEO-${n}`,
    nav: {
      systemSymbol: 'X1-XZ48',
      waypointSymbol: overrides.waypointSymbol ?? 'X1-XZ48-A1',
      status: overrides.status ?? 'DOCKED',
      flightMode: overrides.flightMode ?? 'CRUISE',
      route: { arrival: overrides.arrival ?? '2020-01-01T00:00:00.000Z' },
    },
    frame: overrides.frame ?? { symbol: 'FRAME_FRIGATE', name: 'Frigate' },
    cargo: overrides.cargo ?? { units: 10, capacity: 40 },
    fuel: overrides.fuel ?? { current: 300, capacity: 400 },
  }
}

/** A small, varied fleet — one of each interesting status, for stories that just need "some ships". */
export function makeMockFleet(size = 7) {
  const presets: RawShipOverrides[] = [
    { status: 'DOCKED' },
    {
      status: 'IN_ORBIT',
      frame: { symbol: 'FRAME_PROBE', name: 'Probe' },
      fuel: { current: 0, capacity: 0 },
    },
    {
      status: 'IN_TRANSIT',
      waypointSymbol: 'X1-XZ48-B6',
      arrival: '2099-01-01T00:00:00.000Z',
      frame: { symbol: 'FRAME_PROBE', name: 'Probe' },
      fuel: { current: 0, capacity: 0 },
    },
  ]
  return Array.from({ length: size }, (_, i) => makeMockShip(i + 1, presets[i]))
}

/** One waypoint, as `GET /systems/{system}/waypoints` returns it (page listing shape). */
export function makeMockWaypointSummary(
  n: number,
  overrides: {
    symbol?: string
    type?: string
    x?: number
    y?: number
    faction?: string
    hasMarketplace?: boolean
  } = {},
) {
  return {
    symbol: overrides.symbol ?? `X1-XZ48-W${n}`,
    type: overrides.type ?? 'PLANET',
    x: overrides.x ?? n * 8,
    y: overrides.y ?? n * -5,
    faction: overrides.faction ? { symbol: overrides.faction } : { symbol: 'GALACTIC' },
    hasMarketplace: overrides.hasMarketplace ?? false,
  }
}

/** The first waypoint is the fleet's default home (`X1-XZ48-A1`) and carries a marketplace, so
 * stories showing the fleet and the market together work without any extra wiring. */
export function makeMockWaypoints(count: number) {
  return Array.from({ length: count }, (_, i) =>
    makeMockWaypointSummary(i + 1, i === 0 ? { symbol: 'X1-XZ48-A1', hasMarketplace: true } : {}),
  )
}

/**
 * A waypoint's full detail, as `GET /systems/{system}/waypoints/{waypoint}` actually returns it —
 * every field at once, including `x`/`y`. Two different features read this same endpoint for
 * different fields (`useShipLocation` wants type/faction/traits, `useWaypoints` wants x/y for the
 * ship's own coordinates), so the mock returns the full shape rather than a feature-specific slice.
 */
export function makeMockWaypointDetail(
  overrides: {
    symbol?: string
    type?: string
    x?: number
    y?: number
    faction?: string | null
    hasMarketplace?: boolean
  } = {},
) {
  return {
    symbol: overrides.symbol ?? 'X1-XZ48-A1',
    type: overrides.type ?? 'PLANET',
    x: overrides.x ?? 0,
    y: overrides.y ?? 0,
    faction:
      overrides.faction === undefined ? { symbol: 'GALACTIC' } : { symbol: overrides.faction },
    traits: overrides.hasMarketplace === false ? [] : [{ symbol: 'MARKETPLACE' }],
  }
}

/** One trade good, as `GET .../market` returns it in `tradeGoods` (only present once a ship is there). */
export function makeMockTradeGood(overrides: Record<string, unknown> = {}) {
  return {
    symbol: 'FOOD',
    type: 'IMPORT',
    tradeVolume: 20,
    supply: 'LIMITED',
    activity: 'WEAK',
    purchasePrice: 4340,
    sellPrice: 2089,
    ...overrides,
  }
}

/** A representative market: one exchange good (fuel) plus a handful of imports. */
export function makeMockMarket() {
  return [
    makeMockTradeGood({
      symbol: 'FUEL',
      type: 'EXCHANGE',
      purchasePrice: 72,
      sellPrice: 68,
      activity: undefined,
    }),
    makeMockTradeGood({ symbol: 'FOOD', purchasePrice: 4496, sellPrice: 2185 }),
    makeMockTradeGood({ symbol: 'MEDICINE', purchasePrice: 9582, sellPrice: 4668 }),
    makeMockTradeGood({
      symbol: 'CLOTHING',
      supply: 'SCARCE',
      purchasePrice: 10150,
      sellPrice: 5000,
    }),
    makeMockTradeGood({
      symbol: 'ROBOTIC_DRONES',
      supply: 'SCARCE',
      purchasePrice: 86078,
      sellPrice: 42932,
    }),
  ]
}

/** The shape `apiRequest` throws for a rejected/failed response. */
export function apiError(message: string, code?: number, data?: Record<string, unknown>) {
  return { error: { message, ...(code ? { code } : {}), ...(data ? { data } : {}) } }
}
