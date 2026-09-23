import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type { components } from '@/lib/api-types.gen'

type SoyAdmin = components['schemas']['SoyAdmin']
type Resumen = components['schemas']['ResumenDeInstancia']

// Si quien mira administra la instancia. Contesta a todos con un sí o un no, así el menú
// decide sin pedir datos que le darían 403 y llenarían la consola de quien no es admin.
export const useSoyAdmin = () =>
  useQuery({
    queryKey: ['admin', 'me'],
    queryFn: () => apiFetch<SoyAdmin>('/admin/me'),
    // Rara vez cambia: se otorga en el entorno del servidor y exige reiniciarlo.
    staleTime: 5 * 60_000,
  })

// Se enciende solo cuando ya se sabe que quien mira administra: sin eso, cada persona que
// abre su perfil se llevaría un 403 en la consola.
export const useResumenDeInstancia = (habilitada: boolean) =>
  useQuery({
    queryKey: ['admin', 'summary'],
    enabled: habilitada,
    queryFn: () => apiFetch<Resumen>('/admin/summary'),
  })

type InvitacionALaApp = components['schemas']['InvitacionALaApp']

const INVITACIONES = ['admin', 'invitations'] as const

export const useInvitacionesALaApp = (habilitada: boolean) =>
  useQuery({
    queryKey: INVITACIONES,
    enabled: habilitada,
    queryFn: () => apiFetch<InvitacionALaApp[]>('/admin/invitations'),
  })

export const useInvitarALaApp = () => {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (email: string) =>
      apiFetch<InvitacionALaApp>('/admin/invitations', { method: 'POST', body: JSON.stringify({ email }) }),
    onSuccess: () => client.invalidateQueries({ queryKey: INVITACIONES }),
  })
}

export const useCancelarInvitacionALaApp = () => {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/admin/invitations/${id}`, { method: 'DELETE' }),
    onSuccess: () => client.invalidateQueries({ queryKey: INVITACIONES }),
  })
}
