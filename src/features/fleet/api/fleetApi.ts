import { apiRequest, ApiError, type ApiEnvelope, type ApiListEnvelope } from '@/api/client'

import type { FlightMode, Ship, ShipStatus } from '@/features/fleet/types/ship'

interface FetchShipsParams {
  page: number
  limit: number
  signal?: AbortSignal
}

export async function fetchShips({ page, limit, signal }: FetchShipsParams) {
  const response = await apiRequest<ApiListEnvelope<Ship>>(`my/ships?page=${page}&limit=${limit}`, {
    signal,
  })
  return { ships: response.data, total: response.meta.total }
}

/** A single ship's current data — used to re-check status once a transit should have ended. */
export async function fetchShip(symbol: string, signal?: AbortSignal): Promise<Ship> {
  const response = await apiRequest<ApiEnvelope<Ship>>(`my/ships/${symbol}`, { signal })
  return response.data
}

interface NavResponse {
  nav: { status: ShipStatus }
}

/** Puts a docked ship into orbit. */
export async function orbitShip(symbol: string, signal?: AbortSignal): Promise<ShipStatus> {
  const response = await apiRequest<ApiEnvelope<NavResponse>>(`my/ships/${symbol}/orbit`, {
    method: 'POST',
    signal,
  })
  return response.data.nav.status
}

/** Docks an orbiting ship. */
export async function dockShip(symbol: string, signal?: AbortSignal): Promise<ShipStatus> {
  const response = await apiRequest<ApiEnvelope<NavResponse>>(`my/ships/${symbol}/dock`, {
    method: 'POST',
    signal,
  })
  return response.data.nav.status
}

interface FlightModeResponse {
  nav: { flightMode: FlightMode }
}

/** Sets a ship's flight mode. Unlike dock/orbit, this works whatever the ship's status is —
 * including mid-transit, where it changes the remaining travel time and fuel use. */
export async function setFlightMode(
  symbol: string,
  flightMode: FlightMode,
  signal?: AbortSignal,
): Promise<FlightMode> {
  const response = await apiRequest<ApiEnvelope<FlightModeResponse>>(`my/ships/${symbol}/nav`, {
    method: 'PATCH',
    body: { flightMode },
    signal,
  })
  return response.data.nav.flightMode
}

/** Thrown by `navigateShip` in place of `ApiError` when the request failed for lack of fuel. */
export class InsufficientFuelError extends Error {
  readonly fuelRequired: number
  readonly fuelAvailable: number

  constructor(fuelRequired: number, fuelAvailable: number) {
    super(`Needs ${fuelRequired} fuel, has ${fuelAvailable}.`)
    this.name = 'InsufficientFuelError'
    this.fuelRequired = fuelRequired
    this.fuelAvailable = fuelAvailable
  }
}

// The API's own error code for "not enough fuel to make this trip", distinguishing it from any
// other reason a navigate request could fail (wrong status, unknown waypoint, network, ...).
const INSUFFICIENT_FUEL_CODE = 4203

interface NavigateResponse {
  nav: Ship['nav']
  fuel: Ship['fuel']
}

/**
 * Sends an orbiting ship to another waypoint in the same system. The ship's status becomes
 * `IN_TRANSIT` immediately; arrival isn't — `nav.route.arrival` says when it actually lands.
 */
export async function navigateShip(
  symbol: string,
  waypointSymbol: string,
  signal?: AbortSignal,
): Promise<NavigateResponse> {
  try {
    const response = await apiRequest<ApiEnvelope<NavigateResponse>>(
      `my/ships/${symbol}/navigate`,
      {
        method: 'POST',
        body: { waypointSymbol },
        signal,
      },
    )
    return response.data
  } catch (error) {
    if (error instanceof ApiError) {
      const body = error.body as { error?: { code?: number; data?: Record<string, number> } } | null
      if (body?.error?.code === INSUFFICIENT_FUEL_CODE) {
        const { fuelRequired = 0, fuelAvailable = 0 } = body.error.data ?? {}
        throw new InsufficientFuelError(fuelRequired, fuelAvailable)
      }
    }
    throw error
  }
}
