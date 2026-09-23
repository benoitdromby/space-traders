import { apiRequest, type ApiListEnvelope } from '@/api/client'

import type { WaypointSummary } from '@/features/waypoints/types/waypoint'

/** The API's own cap: asking for more than this per page is rejected. */
export const WAYPOINTS_PAGE_LIMIT = 20

interface RawWaypoint {
  symbol: string
  type: string
  x: number
  y: number
  faction?: { symbol: string }
  traits: { symbol: string }[]
}

interface FetchSystemWaypointsParams {
  systemSymbol: string
  page: number
  signal?: AbortSignal
}

export async function fetchSystemWaypoints({
  systemSymbol,
  page,
  signal,
}: FetchSystemWaypointsParams) {
  const response = await apiRequest<ApiListEnvelope<RawWaypoint>>(
    `systems/${systemSymbol}/waypoints?page=${page}&limit=${WAYPOINTS_PAGE_LIMIT}`,
    { signal },
  )
  const waypoints: WaypointSummary[] = response.data.map((wp) => ({
    symbol: wp.symbol,
    type: wp.type,
    x: wp.x,
    y: wp.y,
    faction: wp.faction?.symbol ?? null,
    hasMarketplace: wp.traits.some((trait) => trait.symbol === 'MARKETPLACE'),
  }))
  return { waypoints, total: response.meta.total }
}
