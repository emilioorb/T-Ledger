import { useQuery } from '@tanstack/react-query'
import type { components } from '@/lib/api-types.gen'
import { apiFetch } from '@/lib/api'

export type LatestRates = components['schemas']['LatestExchangeRates']

// Una hora: la tasa cambia una vez al día, consultarla más seguido es ruido.
const AN_HOUR = 60 * 60 * 1000

export const useLatestRates = () =>
  useQuery({
    queryKey: ['exchange-rates', 'latest'],
    queryFn: () => apiFetch<LatestRates>('/exchange-rates/latest'),
    staleTime: AN_HOUR,
  })
