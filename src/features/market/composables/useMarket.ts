import { ref, watch, type Ref } from 'vue'

import { fetchMarket } from '@/features/market/api/marketApi'
import type { MarketGood } from '@/features/market/types/market'

/**
 * Loads a market's current trade goods whenever `systemSymbol`/`waypointSymbol` are both set,
 * and clears them when either goes back to null — the caller passes null while a modal showing
 * this is closed, so nothing is fetched (or shown stale) until it's actually open again.
 */
export function useMarket(systemSymbol: Ref<string | null>, waypointSymbol: Ref<string | null>) {
  const goods = ref<MarketGood[]>([])
  const status = ref<'idle' | 'loading' | 'error'>('idle')

  let controller: AbortController | null = null

  async function load() {
    const system = systemSymbol.value
    const waypoint = waypointSymbol.value
    controller?.abort()

    if (!system || !waypoint) {
      goods.value = []
      status.value = 'idle'
      return
    }

    controller = new AbortController()
    const { signal } = controller
    status.value = 'loading'
    try {
      const market = await fetchMarket(system, waypoint, signal)
      if (signal.aborted) return
      goods.value = market.goods
      status.value = 'idle'
    } catch {
      if (!signal.aborted) status.value = 'error'
    }
  }

  watch(() => `${systemSymbol.value ?? ''}|${waypointSymbol.value ?? ''}`, load, {
    immediate: true,
  })

  function retry() {
    void load()
  }

  return { goods, status, retry }
}
