import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import { copy } from './copy'
import type { ContributionInput, Goal, GoalInput, GoalPatch } from './types'

export const useGoals = () =>
  useQuery({ queryKey: queryKeys.goals.list(), queryFn: () => apiFetch<Goal[]>('/goals') })

export const useGoal = (id: string) =>
  useQuery({
    queryKey: queryKeys.goals.detail(id),
    queryFn: () => apiFetch<Goal>(`/goals/${id}`),
  })

export const useSaveGoal = () => {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: GoalInput | GoalPatch }) =>
      id
        ? apiFetch<Goal>(`/goals/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
        : apiFetch<Goal>('/goals', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: (_goal, { id }) => {
      toast.success(id ? copy.goals.toast.updated : copy.goals.toast.created)
      void client.invalidateQueries({ queryKey: queryKeys.goals.all })
      void client.invalidateQueries({ queryKey: queryKeys.projection.all })
    },
  })
}

export const useContribute = () => {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ContributionInput }) =>
      apiFetch<Goal>(`/goals/${id}/contributions`, { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: (goal) => {
      // La meta alcanzada se celebra una vez y con mesura: un toast, no una fiesta.
      if (goal.reached) toast.success(copy.goals.toast.reached(goal.name))
      else toast.success(copy.goals.toast.contributed)
      void client.invalidateQueries({ queryKey: queryKeys.goals.all })
      void client.invalidateQueries({ queryKey: queryKeys.projection.all })
    },
  })
}

export const useDeleteGoal = () => {
  const client = useQueryClient()
  return useMutation({
    // La versión que se vio: si otra persona la cambió después, 409 en vez de borrar a ciegas.
    mutationFn: ({ id, version }: Pick<Goal, 'id' | 'version'>) =>
      apiFetch<void>(`/goals/${id}?version=${version}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success(copy.goals.toast.deleted)
      void client.invalidateQueries({ queryKey: queryKeys.goals.all })
      void client.invalidateQueries({ queryKey: queryKeys.projection.all })
    },
  })
}
