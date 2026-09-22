import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { clearAuthToken, getAuthToken, saveAuthToken } from '@/api/authToken'
import { AGENT, authorizationOf, mockFetch } from '@/__tests__/helpers'

import { useAuthStore } from '@/features/auth/stores/authStore'

describe('auth store', () => {
  beforeEach(() => {
    sessionStorage.clear()
    clearAuthToken()
    setActivePinia(createPinia())
  })
  afterEach(() => vi.unstubAllGlobals())

  it('connects with a valid token, then stores it and exposes the agent', async () => {
    const fetchMock = mockFetch(200, { data: AGENT })
    const auth = useAuthStore()

    await expect(auth.connect('  good-token  ')).resolves.toBe(true)

    expect(authorizationOf(fetchMock)).toBe('Bearer good-token')
    expect(auth.agent).toEqual(AGENT)
    expect(auth.isConnected).toBe(true)
    expect(getAuthToken()).toBe('good-token')
  })

  it('never stores a token the API rejected', async () => {
    mockFetch(401, { error: { code: 4100 } })
    const auth = useAuthStore()

    await expect(auth.connect('bad-token')).resolves.toBe(false)

    expect(auth.error).toBe('invalidToken')
    expect(auth.isConnected).toBe(false)
    expect(getAuthToken()).toBeNull()
  })

  it.each([
    [429, 'rateLimited'],
    [500, 'unknown'],
  ])('maps HTTP %i to the "%s" error', async (status, code) => {
    mockFetch(status, {})
    const auth = useAuthStore()
    await auth.connect('token')
    expect(auth.error).toBe(code)
  })

  it('reports a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    const auth = useAuthStore()
    await auth.connect('token')
    expect(auth.error).toBe('network')
    expect(auth.connecting).toBe(false)
  })

  it('ignores an empty token without calling the API', async () => {
    const fetchMock = mockFetch(200, { data: AGENT })
    const auth = useAuthStore()
    await expect(auth.connect('   ')).resolves.toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('restores the session from the stored token', async () => {
    saveAuthToken('stored')
    const fetchMock = mockFetch(200, { data: AGENT })
    const auth = useAuthStore()

    await expect(auth.restore()).resolves.toBe(true)
    expect(authorizationOf(fetchMock)).toBe('Bearer stored')
    expect(auth.agent).toEqual(AGENT)
  })

  it('drops a stored token the API no longer accepts', async () => {
    saveAuthToken('expired')
    mockFetch(401, {})
    const auth = useAuthStore()

    await expect(auth.restore()).resolves.toBe(false)
    expect(auth.hasToken).toBe(false)
    expect(getAuthToken()).toBeNull()
    expect(auth.error).toBe('invalidToken')
  })

  it('tries to restore only once', async () => {
    saveAuthToken('stored')
    const fetchMock = mockFetch(500, {})
    const auth = useAuthStore()

    await auth.restore()
    await auth.restore()
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('disconnect forgets everything', async () => {
    mockFetch(200, { data: AGENT })
    const auth = useAuthStore()
    await auth.connect('token')

    auth.disconnect()

    expect(auth.agent).toBeNull()
    expect(auth.hasToken).toBe(false)
    expect(getAuthToken()).toBeNull()
  })
})
