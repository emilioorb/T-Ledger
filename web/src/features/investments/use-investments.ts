import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import { copy } from './copy'
import type {
  Investment,
  InvestmentContributionInput,
  InvestmentInput,
  InvestmentPatch,
} from './types'

export const useInvestments = () =>
  useQuery({
    queryKey: queryKeys.investments.list(),
    queryFn: () => apiFetch<Investment[]>('/investments'),
  })

export const useInvestmentProjection = (id: string, at: string) =>
  useQuery({
    queryKey: queryKeys.investments.projection(id, at),
    queryFn: () => apiFetch<Investment>(`/investments/${id}/projection?at=${at}`),
    enabled: id !== '',
  })

export const useSaveInvestment = () => {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: InvestmentInput | InvestmentPatch }) =>
      id
        ? apiFetch<Investment>(`/investments/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(input),
          })
        : apiFetch<Investment>('/investments', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: (_investment, { id }) => {
      toast.success(id ? copy.investments.toast.updated : copy.investments.toast.created)
      void client.invalidateQueries({ queryKey: queryKeys.investments.all })
      void client.invalidateQueries({ queryKey: queryKeys.projection.all })
    },
  })
}

export const useAddCapital = () => {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: InvestmentContributionInput }) =>
      apiFetch<Investment>(`/investments/${id}/contributions`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      toast.success(copy.investments.toast.contributed)
      void client.invalidateQueries({ queryKey: queryKeys.investments.all })
      void client.invalidateQueries({ queryKey: queryKeys.projection.all })
    },
  })
}

export const useDeleteInvestment = () => {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/investments/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success(copy.investments.toast.deleted)
      void client.invalidateQueries({ queryKey: queryKeys.investments.all })
      void client.invalidateQueries({ queryKey: queryKeys.projection.all })
    },
  })
}
