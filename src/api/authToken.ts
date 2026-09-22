/**
 * Persistence of the API bearer token.
 *
 * Why the token is NOT read from an environment variable: this is a
 * browser-only app, and anything in `import.meta.env` (VITE_*) is compiled
 * into the public JS bundle. The token is supplied by the user at runtime.
 *
 * Storage: `sessionStorage` only, so it survives a reload but is dropped when
 * the tab closes. It is never put in `localStorage`, a URL, or a log.
 * If storage is unavailable (blocked cookies, private mode), the token is
 * kept in memory for the current page load instead.
 */
const STORAGE_KEY = 'auth-token'

let memoryFallback: string | null = null

export function getAuthToken(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY)
  } catch {
    return memoryFallback
  }
}

export function saveAuthToken(token: string): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, token)
  } catch {
    memoryFallback = token
  }
}

export function clearAuthToken(): void {
  memoryFallback = null
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage unavailable: nothing persisted, nothing to remove.
  }
}
