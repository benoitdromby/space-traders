/** The parts of `GET /systems/{systemSymbol}/waypoints` this app uses, per waypoint. */
export interface WaypointSummary {
  symbol: string
  type: string
  x: number
  y: number
  faction: string | null
  hasMarketplace: boolean
}
