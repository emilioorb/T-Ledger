import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import { copy } from './copy'
import type {
  Debt,
  DebtDirection,
  DebtInput,
  DebtPatch,
  Paginated,
  PayoffPlan,
  PayoffStrategy,
  Projection,
  Schedule,
  SimulateInput,
} from './types'

// Ningún hook trae onError: el QueryCache y el MutationCache del router ya cubren
// todos los errores con un toast. Repetirlo acá duplicaría el toast, no lo reforzaría.

export const useDebts = (direction: DebtDirection, page = 1, pageSize = 20) =>
  useQuery({
    queryKey: queryKeys.debts.list({ page, pageSize, direction }),
    queryFn: () =>
      apiFetch<Paginated<Debt>>(`/debts?page=${page}&pageSize=${pageSize}&direction=${direction}`),
  })

export const useDebt = (id: string) =>
  useQuery({ queryKey: queryKeys.debts.detail(id), queryFn: () => apiFetch<Debt>(`/debts/${id}`) })

export const useSchedule = (id: string) =>
  useQuery({
    queryKey: queryKeys.debts.schedule(id),
    queryFn: () => apiFetch<Schedule>(`/debts/${id}/schedule`),
  })

export const usePayoffPlan = (strategy: PayoffStrategy) =>
  useQuery({
    queryKey: queryKeys.debts.payoffPlan(strategy),
    queryFn: () => apiFetch<PayoffPlan>(`/debts/payoff-plan?strategy=${strategy}`),
  })

export const useCreateDebt = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: DebtInput) =>
      apiFetch<Debt>('/debts', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: async () => {
      toast.success(copy.toast.created)
      await queryClient.invalidateQueries({ queryKey: queryKeys.debts.all })
    },
  })
}

export const useUpdateDebt = (id: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: DebtPatch) =>
      apiFetch<Debt>(`/debts/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
    onSuccess: async () => {
      toast.success(copy.toast.updated)
      await queryClient.invalidateQueries({ queryKey: queryKeys.debts.all })
    },
  })
}

export const useDeleteDebt = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/debts/${id}`, { method: 'DELETE' }),
    onSuccess: async () => {
      toast.success(copy.toast.deleted)
      await queryClient.invalidateQueries({ queryKey: queryKeys.debts.all })
    },
  })
}

export const useSimulateExtraPayment = (id: string) =>
  useMutation({
    mutationFn: (input: SimulateInput) =>
      apiFetch<Projection>(`/debts/${id}/simulate`, { method: 'POST', body: JSON.stringify(input) }),
  })
