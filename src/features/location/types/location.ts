/** The parts of `GET /systems/{systemSymbol}` this app uses. */
export interface SystemSummary {
  symbol: string
  type: string
  x: number
  y: number
  waypointCount: number
}

/** The parts of `GET /systems/{systemSymbol}/waypoints/{waypointSymbol}` this app uses. */
export interface WaypointDetail {
  symbol: string
  type: string
  /** null for a waypoint no faction has claimed. */
  faction: string | null
  hasMarketplace: boolean
}
