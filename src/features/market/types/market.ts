export type MarketGoodType = 'EXPORT' | 'IMPORT' | 'EXCHANGE'
export type MarketSupply = 'SCARCE' | 'LIMITED' | 'MODERATE' | 'ABUNDANT'
export type MarketActivity = 'WEAK' | 'GROWING' | 'STRONG' | 'RESTRICTED'

/** One tradeable good's current prices at a market — only known while a ship is there to see it. */
export interface MarketGood {
  symbol: string
  type: MarketGoodType
  purchasePrice: number
  sellPrice: number
  supply: MarketSupply
  /** Absent for EXCHANGE goods (e.g. fuel) — the API only reports it for imports/exports. */
  activity: MarketActivity | null
}

export interface Market {
  symbol: string
  goods: MarketGood[]
}
