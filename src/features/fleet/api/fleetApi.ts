import { apiRequest, type ApiEnvelope, type ApiListEnvelope } from '@/api/client'

import type { Ship, ShipStatus } from '@/features/fleet/types/ship'

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
