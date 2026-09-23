import { vi } from 'vitest'

export function makeTradeGood(overrides: Record<string, unknown> = {}) {
  return {
    symbol: 'FOOD',
    type: 'IMPORT',
    tradeVolume: 20,
    supply: 'LIMITED',
    activity: 'WEAK',
    purchasePrice: 4340,
    sellPrice: 2089,
    ...overrides,
  }
}

/** Stubs `GET /systems/{system}/waypoints/{waypoint}/market`. */
export function mockMarketApi(
  systemSymbol: string,
  waypointSymbol: string,
  tradeGoods: ReturnType<typeof makeTradeGood>[] | null,
) {
  const stub = vi.fn().mockImplementation(async (input: string) => {
    const url = new URL(input)
    if (url.pathname !== `/v2/systems/${systemSymbol}/waypoints/${waypointSymbol}/market`) {
      return new Response(JSON.stringify({ error: { message: 'not found' } }), { status: 404 })
    }
    return new Response(
      JSON.stringify({
        data: {
          symbol: waypointSymbol,
          exports: [],
          imports: [],
          exchange: [],
          ...(tradeGoods ? { tradeGoods } : {}),
        },
      }),
    )
  })
  vi.stubGlobal('fetch', stub)
  return stub
}
