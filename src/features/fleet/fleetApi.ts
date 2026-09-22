import { apiRequest, type ApiListEnvelope } from '@/api/client'

import type { Ship } from '@/features/fleet/types'

interface FetchShipsParams {
  page: number
  limit: number
  signal?: AbortSignal
}

export async function fetchShips({ page, limit, signal }: FetchShipsParams) {
  const response = await apiRequest<ApiListEnvelope<Ship>>(`my/ships?page=${page}&limit=${limit}`, {
    signal,
  })
  return { ships: response.data, total: response.meta.total }
}
