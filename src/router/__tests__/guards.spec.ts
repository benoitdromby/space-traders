import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory } from 'vue-router'

import { clearAuthToken, getAuthToken, saveAuthToken } from '@/api/authToken'
import { AGENT, mockFetch } from '@/__tests__/helpers'

import { createAppRouter } from '@/router'

describe('auth navigation guard', () => {
  beforeEach(() => {
    sessionStorage.clear()
    clearAuthToken()
    setActivePinia(createPinia())
  })
  afterEach(() => vi.unstubAllGlobals())

  it('sends anonymous visitors from the dashboard to the splash page', async () => {
    const router = createAppRouter(createMemoryHistory())
    await router.push('/dashboard')
    expect(router.currentRoute.value.name).toBe('splash')
  })

  it('resumes a stored session and skips the splash page', async () => {
    saveAuthToken('stored')
    mockFetch(200, { data: AGENT })
    const router = createAppRouter(createMemoryHistory())

    await router.push('/')

    expect(router.currentRoute.value.name).toBe('dashboard')
  })

  it('falls back to the splash page when the stored token is rejected', async () => {
    saveAuthToken('expired')
    mockFetch(401, {})
    const router = createAppRouter(createMemoryHistory())

    await router.push('/dashboard')

    expect(router.currentRoute.value.name).toBe('splash')
    expect(getAuthToken()).toBeNull()
  })
})
