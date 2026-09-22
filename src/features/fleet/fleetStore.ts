import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'

import { useAuthStore } from '@/features/auth/authStore'

import { fetchShips } from './fleetApi'
import type { Ship } from './types'

/** Ships per page. Pagination is only shown when the fleet is larger than this. */
export const PAGE_SIZE = 3

export const useFleetStore = defineStore('fleet', () => {
  const ships = ref<Ship[]>([])
  const total = ref(0)
  const page = ref(1)
  const status = ref<'idle' | 'loading' | 'error'>('idle')
  /** True once a page has been fetched successfully: tells "not loaded yet" from "empty fleet". */
  const loaded = ref(false)
  const selectedSymbol = ref<string | null>(null)

  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))
  const showPagination = computed(() => total.value > PAGE_SIZE)

  let controller: AbortController | null = null

  /** Loads one page of ships. A newer call cancels the one still in flight. */
  async function load(targetPage = page.value) {
    controller?.abort()
    controller = new AbortController()
    const { signal } = controller

    page.value = targetPage
    status.value = 'loading'
    try {
      const result = await fetchShips({ page: targetPage, limit: PAGE_SIZE, signal })
      ships.value = result.ships
      total.value = result.total
      selectedSymbol.value ??= result.ships[0]?.symbol ?? null
      loaded.value = true
      status.value = 'idle'
    } catch {
      // A cancelled request is superseded by a newer one, which owns the status.
      if (!signal.aborted) status.value = 'error'
    }
  }

  function select(symbol: string) {
    selectedSymbol.value = symbol
  }

  function reset() {
    controller?.abort()
    ships.value = []
    total.value = 0
    page.value = 1
    status.value = 'idle'
    loaded.value = false
    selectedSymbol.value = null
  }

  // Never show one agent's ships to the next: drop everything when the session ends.
  const auth = useAuthStore()
  watch(
    () => auth.isConnected,
    (connected) => {
      if (!connected) reset()
    },
  )

  return {
    ships,
    total,
    page,
    status,
    loaded,
    selectedSymbol,
    totalPages,
    showPagination,
    load,
    select,
  }
})
