export type ShipStatus = 'DOCKED' | 'IN_ORBIT' | 'IN_TRANSIT'

export const FLIGHT_MODES = ['CRUISE', 'BURN', 'DRIFT', 'STEALTH'] as const
export type FlightMode = (typeof FLIGHT_MODES)[number]

/** The parts of `GET /my/ships` this app uses. */
export interface Ship {
  symbol: string
  nav: {
    systemSymbol: string
    waypointSymbol: string
    status: ShipStatus
    flightMode: FlightMode
    /** When the ship's current (or most recent) route finishes — in the past unless IN_TRANSIT. */
    route: { arrival: string }
  }
  frame: { symbol: string; name: string }
  cargo: { units: number; capacity: number }
  fuel: { current: number; capacity: number }
}
