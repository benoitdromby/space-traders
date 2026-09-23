import { apiRequest, type ApiEnvelope } from '@/api/client'

import type {
  Market,
  MarketActivity,
  MarketGoodType,
  MarketSupply,
} from '@/features/market/types/market'

interface RawTradeGood {
  symbol: string
  type: MarketGoodType
  purchasePrice: number
  sellPrice: number
  supply: MarketSupply
  activity?: MarketActivity
}

interface RawMarket {
  symbol: string
  /** Only present when one of your ships is actually at this waypoint right now. */
  tradeGoods?: RawTradeGood[]
}

/**
 * A waypoint's current buy/sell prices. The API only includes `tradeGoods` — the actual
 * numbers — while a ship of yours is physically at that waypoint; otherwise this resolves with
 * an empty list rather than throwing, since that's "nothing to show yet", not a failure.
 */
export async function fetchMarket(
  systemSymbol: string,
  waypointSymbol: string,
  signal?: AbortSignal,
): Promise<Market> {
  const response = await apiRequest<ApiEnvelope<RawMarket>>(
    `systems/${systemSymbol}/waypoints/${waypointSymbol}/market`,
    { signal },
  )
  const goods = (response.data.tradeGoods ?? []).map((good) => ({
    symbol: good.symbol,
    type: good.type,
    purchasePrice: good.purchasePrice,
    sellPrice: good.sellPrice,
    supply: good.supply,
    activity: good.activity ?? null,
  }))
  return { symbol: response.data.symbol, goods }
}
