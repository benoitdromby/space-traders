import { beforeEach, describe, expect, it, vi } from 'vitest'

import { clearAuthToken, getAuthToken, saveAuthToken } from '@/api/authToken'

describe('authToken', () => {
  beforeEach(() => {
    sessionStorage.clear()
    localStorage.clear()
    clearAuthToken()
  })

  it('starts without a token', () => {
    expect(getAuthToken()).toBeNull()
  })

  it('stores the token in sessionStorage only, never localStorage', () => {
    saveAuthToken('secret')
    expect(getAuthToken()).toBe('secret')
    expect(sessionStorage.getItem('auth-token')).toBe('secret')
    expect(localStorage.length).toBe(0)
  })

  it('clears the token', () => {
    saveAuthToken('secret')
    clearAuthToken()
    expect(getAuthToken()).toBeNull()
  })

  it('keeps the token in memory when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })

    saveAuthToken('secret')
    expect(getAuthToken()).toBe('secret')

    vi.restoreAllMocks()
  })
})
