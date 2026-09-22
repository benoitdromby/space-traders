import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory } from 'vue-router'

import { clearAuthToken, getAuthToken, saveAuthToken } from '@/api/authToken'
import { mockFetch } from '@/__tests__/helpers'
import { useFleetStore } from '@/features/fleet/stores/fleetStore'
import {
  makeFleet,
  mockAgentAndShipsApi,
  requestedPages,
} from '@/features/fleet/__tests__/fixtures'

import { createAppRouter } from '@/router'

describe('navigation guard', () => {
  beforeEach(() => {
    sessionStorage.clear()
    clearAuthToken()
    setActivePinia(createPinia())
  })
  afterEach(() => vi.unstubAllGlobals())

  it('sends anonymous visitors from a ship route to the splash page', async () => {
    const router = createAppRouter(createMemoryHistory())
    await router.push('/ship/LEO-1')
    expect(router.currentRoute.value.name).toBe('splash')
  })

  it('resumes a stored session and lands on the first ship', async () => {
    saveAuthToken('stored')
    mockAgentAndShipsApi(makeFleet(2))
    const router = createAppRouter(createMemoryHistory())

    await router.push('/')

    expect(router.currentRoute.value.name).toBe('ship')
    expect(router.currentRoute.value.params.symbol).toBe('LEO-1')
  })

  it('falls back to the splash page when the stored token is rejected', async () => {
    saveAuthToken('expired')
    mockFetch(401, {})
    const router = createAppRouter(createMemoryHistory())

    await router.push('/ship/LEO-1')

    expect(router.currentRoute.value.name).toBe('splash')
    expect(getAuthToken()).toBeNull()
  })

  it('going straight to a valid ship URL selects that ship and its page', async () => {
    saveAuthToken('stored')
    const fetchMock = mockAgentAndShipsApi(makeFleet(7)) // LEO-7 lives on page 3
    const router = createAppRouter(createMemoryHistory())

    await router.push('/ship/LEO-7')

    expect(router.currentRoute.value.name).toBe('ship')
    expect(router.currentRoute.value.params.symbol).toBe('LEO-7')
    const fleet = useFleetStore()
    expect(fleet.selectedSymbol).toBe('LEO-7')
    expect(fleet.page).toBe(3)
    expect(requestedPages(fetchMock)).toEqual([1, 2, 3])
  })

  it('redirects an unknown ship symbol to a real one instead of a dead end', async () => {
    saveAuthToken('stored')
    mockAgentAndShipsApi(makeFleet(2))
    const router = createAppRouter(createMemoryHistory())

    await router.push('/ship/NOT-A-REAL-SHIP')

    expect(router.currentRoute.value.name).toBe('ship')
    expect(router.currentRoute.value.params.symbol).toBe('LEO-1')
  })

  it('does not refetch when the URL already matches the selected ship', async () => {
    saveAuthToken('stored')
    const fetchMock = mockAgentAndShipsApi(makeFleet(2))
    const router = createAppRouter(createMemoryHistory())
    await router.push('/ship/LEO-1')
    fetchMock.mockClear()

    await router.push('/ship/LEO-1')

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('moving between two ship URLs updates the selection each time', async () => {
    saveAuthToken('stored')
    mockAgentAndShipsApi(makeFleet(2))
    const router = createAppRouter(createMemoryHistory())
    const fleet = useFleetStore()

    await router.push('/ship/LEO-1')
    expect(fleet.selectedSymbol).toBe('LEO-1')

    await router.push('/ship/LEO-2')
    expect(fleet.selectedSymbol).toBe('LEO-2')
  })
})
