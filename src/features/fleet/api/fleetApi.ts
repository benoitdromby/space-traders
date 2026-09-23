import { apiRequest, type ApiEnvelope, type ApiListEnvelope } from '@/api/client'

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
