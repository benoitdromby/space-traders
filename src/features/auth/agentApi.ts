import { apiRequest, type ApiEnvelope } from '@/api/client'

import type { Agent } from '@/features/auth/types'

/** Reads the agent behind a token: the explicit one, or the stored one when omitted. */
export async function fetchAgent(options: { token?: string } = {}): Promise<Agent> {
  const response = await apiRequest<ApiEnvelope<Agent>>('my/agent', options)
  return response.data
}
