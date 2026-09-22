export type ShipStatus = 'DOCKED' | 'IN_ORBIT' | 'IN_TRANSIT'
export type FlightMode = 'DRIFT' | 'STEALTH' | 'CRUISE' | 'BURN'

/** The parts of `GET /my/ships` this app uses. */
export interface Ship {
  symbol: string
  nav: {
    systemSymbol: string
    waypointSymbol: string
    status: ShipStatus
    flightMode: FlightMode
  }
  frame: { symbol: string; name: string }
  cargo: { units: number; capacity: number }
  fuel: { current: number; capacity: number }
}
