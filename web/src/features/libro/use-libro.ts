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
type EnlaceAlLibro = components['schemas']['EnlaceDeInvitacionAlLibro']

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

// El enlace sale de nuestra API y no de Better Auth: lleva un token que se guarda solo como
// hash, así que cada pedido da uno nuevo y el anterior deja de servir.
export const useEnlaceDeInvitacion = () =>
  useMutation({
    mutationFn: (invitationId: string) =>
      apiFetch<EnlaceAlLibro>(`/book/invitations/${invitationId}/link`, { method: 'POST' }),
    onError: () => toast.error(copy.invitar.linkFailed),
  })

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

type LibroPropio = components['schemas']['LibroPropio']

// La misma consulta que la lista de libros de la cuenta, con la misma clave: comparten caché.
export const useMisLibros = () =>
  useQuery({
    queryKey: ['identity', 'my-books'],
    queryFn: () => apiFetch<LibroPropio[]>('/book/mine'),
  })

// El borrado es nuestro y no el de Better Auth por lo mismo que vaciar: pide la contraseña y
// no deja a nadie sin libro. Después entra al primero que le queda y recarga entero, igual
// que al cambiar de libro: en memoria quedan las cifras del que ya no existe.
export const useBorrarLibro = (nombre: string) =>
  useMutation({
    mutationFn: (password: string) =>
      apiFetch<void>('/book', { method: 'DELETE', body: JSON.stringify({ password }) }),
    onSuccess: async () => {
      const [siguiente] = await apiFetch<LibroPropio[]>('/book/mine')
      if (siguiente) await organization.setActive({ organizationId: siguiente.id })
      toast.success(copy.borrar.done(nombre))
      window.location.assign('/tablero')
    },
    onError: (error: unknown) => toast.error(motivoDelRechazo(error)),
  })

// Por el `status` y no por el texto, igual que al vaciar: el 401 es la contraseña y el 409
// es el último libro, las dos cosas que la persona puede entender y corregir.
const motivoDelRechazo = (error: unknown): string => {
  if (!(error instanceof ApiError)) return copy.borrar.failed
  if (error.status === 401) return copy.borrar.wrongPassword
  if (error.status === 409) return copy.borrar.lastBook
  return copy.borrar.failed
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
