/** `GET /my/agent` */
export interface Agent {
  accountId?: string
  symbol: string
  headquarters: string
  credits: number
  startingFaction: string
  shipCount?: number
}

/** Each code has a matching message under `auth.errors` in the locale files. */
export type AuthErrorCode = 'invalidToken' | 'rateLimited' | 'network' | 'unknown'
