import { apiRequest, type ApiEnvelope, type ApiListEnvelope } from '@/api/client'

import type { WaypointSummary } from '@/features/waypoints/types/waypoint'

/** The API's own cap: asking for more than this per page is rejected. */
export const WAYPOINTS_PAGE_LIMIT = 20

interface RawWaypoint {
  symbol: string
  type: string
  x: number
  y: number
  faction?: { symbol: string }
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
  }))
  return { waypoints, total: response.meta.total }
}

interface RawWaypointCoordinates {
  x: number
  y: number
}

/**
 * Just one waypoint's coordinates — used as the origin point for distances shown against the
 * rest of the system's list. A dedicated request rather than relying on the paginated list to
 * happen to have reached it yet: this needs to resolve immediately, whichever page it's on.
 */
export async function fetchWaypointCoordinates(
  systemSymbol: string,
  waypointSymbol: string,
  signal?: AbortSignal,
): Promise<{ x: number; y: number }> {
  const response = await apiRequest<ApiEnvelope<RawWaypointCoordinates>>(
    `systems/${systemSymbol}/waypoints/${waypointSymbol}`,
    { signal },
  )
  return { x: response.data.x, y: response.data.y }
}
