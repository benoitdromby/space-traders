import { vi } from 'vitest'

export const AGENT = {
  accountId: 'acc-1',
  symbol: 'LEO',
  headquarters: 'X1-XZ48-A1',
  credits: 175000,
  startingFaction: 'GALACTIC',
  shipCount: 2,
}

/** Replaces `fetch` with a stub answering with the given status and JSON body. */
export function mockFetch(status: number, body: unknown) {
  const stub = vi
    .fn()
    .mockImplementation(async () => new Response(JSON.stringify(body), { status }))
  vi.stubGlobal('fetch', stub)
  return stub
}

/** Reads the Authorization header the stub received on call `n`. */
export function authorizationOf(stub: ReturnType<typeof mockFetch>, n = 0): string | undefined {
  return (stub.mock.calls[n]![1] as RequestInit & { headers: Record<string, string> }).headers
    .Authorization
}
