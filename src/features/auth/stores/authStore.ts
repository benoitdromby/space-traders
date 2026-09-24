import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { ApiError, setUnauthorizedHandler } from '@/api/client'
import { clearAuthToken, getAuthToken, saveAuthToken } from '@/api/authToken'

import { fetchAgent } from '@/features/auth/api/agentApi'
import type { Agent, AuthErrorCode } from '@/features/auth/types/agent'

// A bearer token is visible ASCII with no whitespace (a JWT: letters, digits, "-", "_", "."). Anything
// else (an emoji pasted by mistake, stray spaces inside) can never be a valid token — and fetch()
// refuses to even send it as a header, which would otherwise surface as a misleading "network" error.
const TOKEN_PATTERN = /^[\x21-\x7E]+$/

function toAuthErrorCode(error: unknown): AuthErrorCode {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'invalidToken'
    if (error.status === 429) return 'rateLimited'
    return 'unknown'
  }
  // fetch() rejects with a TypeError when the network is unreachable.
  return error instanceof TypeError ? 'network' : 'unknown'
}

export const useAuthStore = defineStore('auth', () => {
  const agent = ref<Agent | null>(null)
  const connecting = ref(false)
  const error = ref<AuthErrorCode | null>(null)
  const hasToken = ref(getAuthToken() !== null)
  const isConnected = computed(() => agent.value !== null)

  let restoreAttempted = false

  async function authenticate(load: () => Promise<Agent>, tokenToPersist?: string) {
    connecting.value = true
    error.value = null
    try {
      agent.value = await load()
      // Only a token the API accepted is ever persisted.
      if (tokenToPersist) saveAuthToken(tokenToPersist)
      hasToken.value = true
      return true
    } catch (e) {
      error.value = toAuthErrorCode(e)
      return false
    } finally {
      connecting.value = false
    }
  }

  /** Validates a token entered by the user and, if the API accepts it, stores it. */
  async function connect(rawToken: string): Promise<boolean> {
    const token = rawToken.trim()
    if (!token) return false
    if (!TOKEN_PATTERN.test(token)) {
      error.value = 'invalidToken'
      return false
    }
    return authenticate(() => fetchAgent({ token }), token)
  }

  /** Resumes the session from the stored token, once per page load. */
  async function restore(): Promise<boolean> {
    if (restoreAttempted || !getAuthToken()) return isConnected.value
    restoreAttempted = true
    return authenticate(() => fetchAgent())
  }

  function disconnect() {
    clearAuthToken()
    hasToken.value = false
    agent.value = null
    error.value = null
  }

  // A 401 on any request means the stored token is no longer valid.
  setUnauthorizedHandler(disconnect)

  return { agent, connecting, error, hasToken, isConnected, connect, restore, disconnect }
})
