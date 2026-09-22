import { clearAuthToken, getAuthToken } from './authToken'

const DEFAULT_API_BASE_URL = 'https://api.spacetraders.io/v2'

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(
  /\/+$/,
  '',
)

/** Every successful SpaceTraders response wraps its payload in `data`. */
export interface ApiEnvelope<T> {
  data: T
}

/** Paginated endpoints add a `meta` block next to `data`. */
export interface ApiListEnvelope<T> extends ApiEnvelope<T[]> {
  meta: { total: number; page: number; limit: number }
}

export class ApiError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(status: number, body: unknown) {
    super(`API request failed with status ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  /** Set to false for public endpoints (e.g. registering a new agent). */
  auth?: boolean
  /**
   * Use this token instead of the stored one, e.g. to validate a token the user
   * just typed before it is persisted. A 401 then says nothing about the stored
   * session, so it is not treated as a logout.
   */
  token?: string
  signal?: AbortSignal
}

let onUnauthorized: (() => void) | null = null

/** Registers what happens when the stored token is rejected (401). */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler
}

/**
 * Minimal typed fetch wrapper for the API.
 *
 * The bearer token is attached here only, and only to requests built from
 * API_BASE_URL (callers pass a path, never a full URL), so it cannot be
 * leaked to another origin.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, token: explicitToken, signal } = options
  const headers: Record<string, string> = { Accept: 'application/json' }

  if (body !== undefined) headers['Content-Type'] = 'application/json'

  if (auth) {
    const token = explicitToken ?? getAuthToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}/${path.replace(/^\/+/, '')}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  })

  const payload: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    // A rejected stored token can never succeed again: forget it.
    if (auth && explicitToken === undefined && response.status === 401) {
      clearAuthToken()
      onUnauthorized?.()
    }
    throw new ApiError(response.status, payload)
  }

  return payload as T
}
