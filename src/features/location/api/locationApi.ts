import { apiRequest, type ApiEnvelope } from '@/api/client'

import type { SystemSummary, WaypointDetail } from '@/features/location/types/location'

interface RawSystem {
  symbol: string
  type: string
  x: number
  y: number
  waypoints: unknown[]
}

interface RawWaypoint {
  symbol: string
  type: string
  faction?: { symbol: string }
  traits: { symbol: string }[]
}

export async function fetchSystem(
  systemSymbol: string,
  signal?: AbortSignal,
): Promise<SystemSummary> {
  const response = await apiRequest<ApiEnvelope<RawSystem>>(`systems/${systemSymbol}`, { signal })
  const system = response.data
  return {
    symbol: system.symbol,
    type: system.type,
    x: system.x,
    y: system.y,
    waypointCount: system.waypoints.length,
  }
}

export async function fetchWaypoint(
  systemSymbol: string,
  waypointSymbol: string,
  signal?: AbortSignal,
): Promise<WaypointDetail> {
  const response = await apiRequest<ApiEnvelope<RawWaypoint>>(
    `systems/${systemSymbol}/waypoints/${waypointSymbol}`,
    { signal },
  )
  const waypoint = response.data
  return {
    symbol: waypoint.symbol,
    type: waypoint.type,
    faction: waypoint.faction?.symbol ?? null,
    hasMarketplace: waypoint.traits.some((trait) => trait.symbol === 'MARKETPLACE'),
  }
}
