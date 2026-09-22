import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { authorizationOf, mockFetch } from '@/__tests__/helpers'

import { clearAuthToken, getAuthToken, saveAuthToken } from '../authToken'
import { ApiError, apiRequest, setUnauthorizedHandler } from '../client'

describe('apiRequest', () => {
  beforeEach(() => {
    sessionStorage.clear()
    clearAuthToken()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    setUnauthorizedHandler(null)
  })

  it('sends the stored bearer token to the API base URL', async () => {
    saveAuthToken('secret')
    const fetchMock = mockFetch(200, { data: 1 })

    await expect(apiRequest('my/agent')).resolves.toEqual({ data: 1 })

    expect(fetchMock.mock.calls[0]![0]).toBe('https://api.spacetraders.io/v2/my/agent')
    expect(authorizationOf(fetchMock)).toBe('Bearer secret')
  })

  it('prefers an explicit token over the stored one', async () => {
    saveAuthToken('stored')
    const fetchMock = mockFetch(200, {})

    await apiRequest('my/agent', { token: 'typed' })

    expect(authorizationOf(fetchMock)).toBe('Bearer typed')
  })

  it('omits the token on public requests', async () => {
    saveAuthToken('secret')
    const fetchMock = mockFetch(200, {})

    await apiRequest('register', { method: 'POST', body: {}, auth: false })

    expect(authorizationOf(fetchMock)).toBeUndefined()
  })

  it('forgets the stored token and notifies on 401', async () => {
    saveAuthToken('expired')
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    mockFetch(401, { error: { message: 'unauthorized' } })

    await expect(apiRequest('my/agent')).rejects.toBeInstanceOf(ApiError)
    expect(getAuthToken()).toBeNull()
    expect(handler).toHaveBeenCalledOnce()
  })

  it('does not touch the stored token when an explicit token is rejected', async () => {
    saveAuthToken('good')
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    mockFetch(401, {})

    await expect(apiRequest('my/agent', { token: 'typo' })).rejects.toBeInstanceOf(ApiError)
    expect(getAuthToken()).toBe('good')
    expect(handler).not.toHaveBeenCalled()
  })
})
