import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ApiError, apiFetch } from '@/lib/api'
import { organization } from '@/features/identity/auth-client'
import type { components } from '@/lib/api-types.gen'
import { copy } from './copy'

export type RolDelLibro = 'owner' | 'editor' | 'viewer'

export interface Invitacion {
  id: string
  email: string
  role?: string | null
  status: string
  expiresAt: Date | string
}

type Vaciado = components['schemas']['Vaciado']

// Las invitaciones no vienen con la organización activa: hay que pedirlas aparte, y solo las
// ve quien puede administrarlas. Por eso la consulta se enciende con `habilitada` en vez de
// correr siempre y dejar un 403 en la consola de todo el mundo.
export const useInvitaciones = (habilitada: boolean) =>
  useQuery({
    queryKey: ['identity', 'invitations'],
    enabled: habilitada,
    queryFn: async () => {
      const { data, error } = await organization.listInvitations()
      if (error) throw new Error(error.message)
      return (data ?? []).filter((invitacion) => invitacion.status === 'pending') as Invitacion[]
    },
  })

// Todo lo que cambia la gente invalida lo mismo: la organización activa —que trae los
// miembros— y las invitaciones. Centralizarlo acá evita que una pantalla se quede mostrando
// a alguien que acaba de salir.
const useRefrescarGente = () => {
  const cliente = useQueryClient()
  return async () => {
    await Promise.all([
      cliente.invalidateQueries({ queryKey: ['identity', 'invitations'] }),
      organization.getFullOrganization({ query: {} }),
    ])
  }
}

export const useInvitar = () => {
  const refrescar = useRefrescarGente()

  return useMutation({
    mutationFn: async ({ email, role }: { email: string; role: RolDelLibro }) => {
      const { data, error } = await organization.inviteMember({ email, role })
      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: async () => {
      toast.success(copy.invitar.created)
      await refrescar()
    },
    onError: () => toast.error(copy.invitar.failed),
  })
}

export const useCancelarInvitacion = () => {
  const refrescar = useRefrescarGente()

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await organization.cancelInvitation({ invitationId })
      if (error) throw new Error(error.message)
    },
    onSuccess: async () => {
      toast.success(copy.invitar.cancelled)
      await refrescar()
    },
    onError: () => toast.error(copy.invitar.cancelFailed),
  })
}

export const useCambiarRol = () => {
  const refrescar = useRefrescarGente()

  return useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: RolDelLibro }) => {
      const { error } = await organization.updateMemberRole({ memberId, role })
      if (error) throw new Error(error.message)
    },
    onSuccess: async () => {
      toast.success(copy.gente.roleChanged)
      await refrescar()
    },
    onError: () => toast.error(copy.gente.roleFailed),
  })
}

export const useSacarMiembro = () => {
  const refrescar = useRefrescarGente()

  return useMutation({
    mutationFn: async (memberIdOrEmail: string) => {
      const { error } = await organization.removeMember({ memberIdOrEmail })
      if (error) throw new Error(error.message)
    },
    onSuccess: async () => {
      toast.success(copy.gente.removed)
      await refrescar()
    },
    onError: () => toast.error(copy.gente.removeFailed),
  })
}

export const useRenombrarLibro = () => {
  const refrescar = useRefrescarGente()

  return useMutation({
    mutationFn: async ({ organizationId, name }: { organizationId: string; name: string }) => {
      const { error } = await organization.update({ organizationId, data: { name } })
      if (error) throw new Error(error.message)
    },
    onSuccess: async () => {
      toast.success(copy.nombre.saved)
      await refrescar()
    },
    onError: () => toast.error(copy.nombre.failed),
  })
}

// Lo único de esta pantalla que no es de Better Auth: vaciar es nuestro, con su caso de uso,
// su permiso y su entrada en el registro.
export const useVaciarLibro = () => {
  const cliente = useQueryClient()

  return useMutation({
    mutationFn: (password: string) =>
      apiFetch<Vaciado>('/book/empty', { method: 'POST', body: JSON.stringify({ password }) }),
    onSuccess: async ({ total }) => {
      toast.success(copy.vaciar.done(total))
      // La caché entera: después de un vaciado no queda una sola consulta cuya respuesta
      // siga siendo cierta.
      cliente.clear()
      await cliente.invalidateQueries()
    },
    // El 401 es la contraseña equivocada, que es lo único que la persona puede corregir. Se
    // pregunta por el `status` del error y no por su texto: el mensaje lo escribe el
    // servidor y cambiarlo allá no tiene por qué romper la pantalla de acá.
    onError: (error: unknown) =>
      toast.error(
        error instanceof ApiError && error.status === 401
          ? copy.vaciar.wrongPassword
          : copy.vaciar.failed,
      ),
  })
}
