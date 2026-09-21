import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import type { MonthlyFlow } from './types'

export const useCashFlowProjection = (months: number, currency: string) =>
  useQuery({
    queryKey: queryKeys.projection.cashFlow(months, currency),
    queryFn: () => apiFetch<MonthlyFlow[]>(`/projections?months=${months}&currency=${currency}`),
  })
