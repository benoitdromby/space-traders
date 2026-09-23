import { afterEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import { mockFetch } from '@/__tests__/helpers'
import { useMarket } from '@/features/market/composables/useMarket'

import { makeTradeGood, mockMarketApi } from '@/features/market/__tests__/fixtures'

describe('useMarket', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('does nothing while either symbol is null', () => {
    const stub = mockMarketApi('X1-XZ48', 'X1-XZ48-A1', [makeTradeGood()])
    const { goods, status } = useMarket(ref('X1-XZ48'), ref(null))

    expect(stub).not.toHaveBeenCalled()
    expect(goods.value).toEqual([])
    expect(status.value).toBe('idle')
  })

  it('loads the trade goods once both symbols are set', async () => {
    mockMarketApi('X1-XZ48', 'X1-XZ48-A1', [
      makeTradeGood({ symbol: 'FOOD', purchasePrice: 4340, sellPrice: 2089 }),
    ])
    const system = ref<string | null>('X1-XZ48')
    const waypoint = ref<string | null>('X1-XZ48-A1')
    const { goods, status } = useMarket(system, waypoint)

    await vi.waitFor(() => expect(status.value).toBe('idle'))
    expect(goods.value).toEqual([
      {
        symbol: 'FOOD',
        type: 'IMPORT',
        purchasePrice: 4340,
        sellPrice: 2089,
        supply: 'LIMITED',
        activity: 'WEAK',
      },
    ])
  })

  it('resolves to an empty list when no ship is there to see prices', async () => {
    mockMarketApi('X1-XZ48', 'X1-XZ48-A1', null) // no tradeGoods in the response
    const { goods, status } = useMarket(ref('X1-XZ48'), ref('X1-XZ48-A1'))

    await vi.waitFor(() => expect(status.value).toBe('idle'))
    expect(goods.value).toEqual([])
  })

  it('clears everything once a symbol goes back to null', async () => {
    mockMarketApi('X1-XZ48', 'X1-XZ48-A1', [makeTradeGood()])
    const system = ref<string | null>('X1-XZ48')
    const waypoint = ref<string | null>('X1-XZ48-A1')
    const { goods, status } = useMarket(system, waypoint)
    await vi.waitFor(() => expect(goods.value).toHaveLength(1))

    waypoint.value = null
    await vi.waitFor(() => expect(goods.value).toEqual([]))
    expect(status.value).toBe('idle')
  })

  it('re-fetches when the waypoint changes', async () => {
    mockMarketApi('X1-XZ48', 'X1-XZ48-A1', [makeTradeGood()])
    const system = ref<string | null>('X1-XZ48')
    const waypoint = ref<string | null>('X1-XZ48-A1')
    const { goods } = useMarket(system, waypoint)
    await vi.waitFor(() => expect(goods.value).toHaveLength(1))

    mockMarketApi('X1-XZ48', 'X1-XZ48-B2', [makeTradeGood({ symbol: 'MEDICINE' })])
    waypoint.value = 'X1-XZ48-B2'
    await vi.waitFor(() => expect(goods.value[0]?.symbol).toBe('MEDICINE'))
  })

  it('flags an error on failure and can retry', async () => {
    mockFetch(500, {})
    const { status, retry } = useMarket(ref('X1-XZ48'), ref('X1-XZ48-A1'))

    await vi.waitFor(() => expect(status.value).toBe('error'))

    mockMarketApi('X1-XZ48', 'X1-XZ48-A1', [makeTradeGood()])
    retry()
    await vi.waitFor(() => expect(status.value).toBe('idle'))
  })
})
