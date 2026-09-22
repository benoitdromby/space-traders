import { apiRequest, type ApiEnvelope } from '@/api/client'

import type { Agent } from '@/features/auth/types/agent'

export async function fetchAgent(options: { token?: string } = {}): Promise<Agent> {
  const response = await apiRequest<ApiEnvelope<Agent>>('my/agent', options)
  return response.data
}
