import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import { copy } from './copy'
import type {
  BudgetEvaluation,
  BudgetModel,
  BudgetModelInput,
  CurrencyCode,
  Money,
  MonthlyIncome,
} from './types'

export const useBudgetEvaluation = (month: string, currency: CurrencyCode) =>
  useQuery({
    queryKey: queryKeys.budget.evaluation(month, currency),
    queryFn: () =>
      apiFetch<BudgetEvaluation>(`/budget/evaluation?month=${month}&currency=${currency}`),
    // Sin modelo activo la API responde 422: ni se reintenta ni se avisa por toast,
    // porque la pantalla lo explica con un estado vacío que lleva a resolverlo.
    retry: false,
  })

export const useMonthlyIncome = (month: string) =>
  useQuery({
    queryKey: queryKeys.budget.income(month),
    queryFn: () => apiFetch<MonthlyIncome | null>(`/budget/income/${month}`),
  })

export const useSetMonthlyIncome = () => {
  const client = useQueryClient()
  return useMutation({
    // `version` es la del ingreso que se vio; `null`, que se vio el mes sin declarar. Si otra
    // persona lo declaró o lo cambió en el medio, 409 en vez de pisarla.
    mutationFn: ({ month, amount, version }: { month: string; amount: Money; version: number | null }) =>
      apiFetch<MonthlyIncome>(`/budget/income/${month}`, {
        method: 'PUT',
        body: JSON.stringify({ amount, version }),
      }),
    onSuccess: () => {
      toast.success(copy.budget.toast.incomeSaved)
      void client.invalidateQueries({ queryKey: queryKeys.budget.all })
      void client.invalidateQueries({ queryKey: queryKeys.projection.all })
    },
  })
}

export const useBudgetModels = () =>
  useQuery({
    queryKey: queryKeys.budget.models(),
    queryFn: () => apiFetch<BudgetModel[]>('/budget-models'),
  })

export const useSaveBudgetModel = () => {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: BudgetModelInput & { version?: number } }) =>
      id
        ? apiFetch<BudgetModel>(`/budget-models/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(input),
          })
        : apiFetch<BudgetModel>('/budget-models', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: (_model, { id }) => {
      toast.success(id ? copy.models.toast.updated : copy.models.toast.created)
      void client.invalidateQueries({ queryKey: queryKeys.budget.all })
    },
  })
}
