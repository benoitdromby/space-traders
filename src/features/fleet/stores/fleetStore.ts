import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'

import { useAuthStore } from '@/features/auth/stores/authStore'

import { fetchShips } from '@/features/fleet/api/fleetApi'
import type { Ship } from '@/features/fleet/types/ship'

/** Ships per page. Pagination is only shown when the fleet is larger than this. */
export const PAGE_SIZE = 3

export const useFleetStore = defineStore('fleet', () => {
  const ships = ref<Ship[]>([])
  const total = ref(0)
  const page = ref(1)
  const status = ref<'idle' | 'loading' | 'error'>('idle')
  /** True once a page has been fetched successfully: tells "not loaded yet" from "empty fleet". */
  const loaded = ref(false)
  // The full record, not just its symbol: other features (e.g. the location panel) need its
  // nav data, and the selected ship isn't always on the page currently displayed.
  const selectedShip = ref<Ship | null>(null)
  const selectedSymbol = computed(() => selectedShip.value?.symbol ?? null)

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
      selectedShip.value ??= result.ships[0] ?? null
      loaded.value = true
      status.value = 'idle'
    } catch {
      // A cancelled request is superseded by a newer one, which owns the status.
      if (!signal.aborted) status.value = 'error'
    }
  }

  function select(ship: Ship) {
    selectedShip.value = ship
  }

  function reset() {
    controller?.abort()
    ships.value = []
    total.value = 0
    page.value = 1
    status.value = 'idle'
    loaded.value = false
    selectedShip.value = null
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
    selectedShip,
    selectedSymbol,
    totalPages,
    showPagination,
    load,
    select,
  }
})
