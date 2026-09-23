import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { i18n } from '@/i18n'
import { useFleetActions } from '@/features/fleet/composables/useFleetActions'
import { useFleetStore } from '@/features/fleet/stores/fleetStore'

describe('useFleetActions', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    i18n.global.locale.value = 'en'
  })
  afterEach(() => vi.restoreAllMocks())

  describe('toggleDocking', () => {
    it('tracks the pending state around the call, for that ship only', async () => {
      const fleet = useFleetStore()
      let resolveToggle!: () => void
      vi.spyOn(fleet, 'toggleDocking').mockReturnValue(
        new Promise((resolve) => (resolveToggle = () => resolve(undefined))),
      )
      const { togglingSymbols, toggleDocking } = useFleetActions()

      const promise = toggleDocking('LEO-1')
      expect(togglingSymbols.value.has('LEO-1')).toBe(true)
      expect(togglingSymbols.value.has('LEO-2')).toBe(false)
      resolveToggle()
      await promise

      expect(togglingSymbols.value.has('LEO-1')).toBe(false)
    })

    it('records a generic error for the ship that failed, not any other', async () => {
      const fleet = useFleetStore()
      vi.spyOn(fleet, 'toggleDocking').mockRejectedValue(new Error('boom'))
      const { toggleErrors, toggleDocking } = useFleetActions()

      await toggleDocking('LEO-1')

      expect(toggleErrors['LEO-1']).toBe('Could not update this ship. Try again.')
      expect(toggleErrors['LEO-2']).toBeUndefined()
    })

    it('clears a previous error once a retry succeeds', async () => {
      const fleet = useFleetStore()
      const toggleDockingSpy = vi.spyOn(fleet, 'toggleDocking')
      toggleDockingSpy.mockRejectedValueOnce(new Error('boom'))
      const { toggleErrors, toggleDocking } = useFleetActions()

      await toggleDocking('LEO-1')
      expect(toggleErrors['LEO-1']).toBeDefined()

      toggleDockingSpy.mockResolvedValueOnce(undefined)
      await toggleDocking('LEO-1')

      expect(toggleErrors['LEO-1']).toBeUndefined()
    })
  })

  describe('changeFlightMode', () => {
    it('tracks the pending state around the call, for that ship only', async () => {
      const fleet = useFleetStore()
      let resolveChange!: () => void
      vi.spyOn(fleet, 'changeFlightMode').mockReturnValue(
        new Promise((resolve) => (resolveChange = () => resolve(undefined))),
      )
      const { changingModeSymbols, changeFlightMode } = useFleetActions()

      const promise = changeFlightMode('LEO-1', 'BURN')
      expect(changingModeSymbols.value.has('LEO-1')).toBe(true)
      resolveChange()
      await promise

      expect(changingModeSymbols.value.has('LEO-1')).toBe(false)
      expect(fleet.changeFlightMode).toHaveBeenCalledWith('LEO-1', 'BURN')
    })

    it('records a generic error for the ship that failed, not any other', async () => {
      const fleet = useFleetStore()
      vi.spyOn(fleet, 'changeFlightMode').mockRejectedValue(new Error('boom'))
      const { modeErrors, changeFlightMode } = useFleetActions()

      await changeFlightMode('LEO-1', 'DRIFT')

      expect(modeErrors['LEO-1']).toBe('Could not update this ship. Try again.')
      expect(modeErrors['LEO-2']).toBeUndefined()
    })

    it('does not share pending/error state with toggleDocking', async () => {
      const fleet = useFleetStore()
      vi.spyOn(fleet, 'changeFlightMode').mockRejectedValue(new Error('boom'))
      const { toggleErrors, modeErrors, changeFlightMode } = useFleetActions()

      await changeFlightMode('LEO-1', 'DRIFT')

      expect(modeErrors['LEO-1']).toBeDefined()
      expect(toggleErrors['LEO-1']).toBeUndefined()
    })
  })
})
