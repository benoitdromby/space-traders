import { reactive, ref } from 'vue'

import { i18n } from '@/i18n'
import { useFleetStore } from '@/features/fleet/stores/fleetStore'
import type { FlightMode } from '@/features/fleet/types/ship'

/**
 * Dock/orbit toggling and flight-mode changes for the fleet list, tracked per ship symbol — this
 * acts on a whole page of ships at once, unlike `useShipTravel`, which only ever concerns the
 * single currently selected ship.
 *
 * Uses `i18n.global` rather than `useI18n()`: the latter needs an active component setup, which
 * would force every test of this composable to mount a throwaway component just to call it.
 * (In this app's set-up, without per-component locale scopes, the two are equivalent anyway.)
 */
export function useFleetActions() {
  const fleet = useFleetStore()

  // Per-ship, not global: one ship's request in flight (or failed) shouldn't affect how any
  // other ship's card looks. Dock/orbit and flight mode are tracked separately since either can
  // be in flight (or have failed) independently of the other, for the same ship.
  const togglingSymbols = ref(new Set<string>())
  const toggleErrors = reactive<Record<string, string>>({})
  const changingModeSymbols = ref(new Set<string>())
  const modeErrors = reactive<Record<string, string>>({})

  async function toggleDocking(symbol: string) {
    togglingSymbols.value.add(symbol)
    delete toggleErrors[symbol]
    try {
      await fleet.toggleDocking(symbol)
    } catch {
      toggleErrors[symbol] = i18n.global.t('fleet.actions.error')
    } finally {
      togglingSymbols.value.delete(symbol)
    }
  }

  async function changeFlightMode(symbol: string, mode: FlightMode) {
    changingModeSymbols.value.add(symbol)
    delete modeErrors[symbol]
    try {
      await fleet.changeFlightMode(symbol, mode)
    } catch {
      modeErrors[symbol] = i18n.global.t('fleet.actions.error')
    } finally {
      changingModeSymbols.value.delete(symbol)
    }
  }

  return {
    togglingSymbols,
    toggleErrors,
    changingModeSymbols,
    modeErrors,
    toggleDocking,
    changeFlightMode,
  }
}
