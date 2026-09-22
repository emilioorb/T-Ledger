import { MailIcon, UsersIcon } from 'lucide-react'
import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Seccion } from '@/features/cuenta/seccion'
import { formatLongDate } from '@/lib/dates'
import { copy } from './copy'
import { Invitar } from './invitar'
import {
  useCambiarRol,
  useCancelarInvitacion,
  useInvitaciones,
  useSacarMiembro,
  type Invitacion,
  type RolDelLibro,
} from './use-libro'

export interface Miembro {
  id: string
  userId: string
  role: string
  user: { name?: string | null; email: string }
}

interface Props {
  miembros: Miembro[]
  soyYo: string
  puedoAdministrar: boolean
}

const ROLES: RolDelLibro[] = ['owner', 'editor', 'viewer']

const esRolConocido = (rol: string): rol is RolDelLibro => ROLES.includes(rol as RolDelLibro)

const inicial = (nombre: string, correo: string) => (nombre || correo).slice(0, 1).toUpperCase()

const enDia = (fecha: Date | string) => new Date(fecha).toISOString().slice(0, 10)

// Quién entra al libro y qué puede hacer. Sin tabla: son dos o tres personas, y una tabla de
// tres filas con encabezados pesa más que lo que muestra.
export const LaGente = ({ miembros, soyYo, puedoAdministrar }: Props) => {
  const [sacando, setSacando] = useState<Miembro | null>(null)
  const { data: invitaciones } = useInvitaciones(puedoAdministrar)
  const cambiarRol = useCambiarRol()
  const sacar = useSacarMiembro()
  const cancelar = useCancelarInvitacion()

  const duennos = miembros.filter((miembro) => miembro.role === 'owner').length

  return (
    <Seccion title={copy.gente.title} hint={copy.gente.hint} icon={UsersIcon}>
      <ul className="divide-y divide-border">
        {miembros.map((miembro) => {
          const nombre = miembro.user.name ?? ''
          const soyEste = miembro.userId === soyYo
          // El último dueño no se degrada ni se saca: el libro quedaría sin nadie que pueda
          // decidir quién entra, y eso no se puede deshacer desde ninguna pantalla.
          const esElUltimoDuenno = miembro.role === 'owner' && duennos === 1

          return (
            <li key={miembro.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0">
              <Avatar className="size-8 rounded-md after:rounded-md">
                <AvatarFallback className="rounded-md text-xs font-semibold">
                  {inicial(nombre, miembro.user.email)}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">
                  {nombre || miembro.user.email}
                  {soyEste ? (
                    <span className="ml-2 text-xs text-muted-foreground">· {copy.gente.you}</span>
                  ) : null}
                </p>
                <p className="num truncate text-xs text-muted-foreground">{miembro.user.email}</p>
              </div>

              {puedoAdministrar && esRolConocido(miembro.role) && !esElUltimoDuenno ? (
                <Select
                  value={miembro.role}
                  onValueChange={(rol) =>
                    cambiarRol.mutate({ memberId: miembro.id, role: rol as RolDelLibro })
                  }
                >
                  <SelectTrigger
                    className="h-8 w-32"
                    aria-label={copy.gente.changeRole(nombre || miembro.user.email)}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((rol) => (
                      <SelectItem key={rol} value={rol}>
                        {copy.gente.roles[rol].name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {esRolConocido(miembro.role) ? copy.gente.roles[miembro.role].name : miembro.role}
                </span>
              )}

              {puedoAdministrar && !soyEste && !esElUltimoDuenno ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={sacar.isPending}
                  onClick={() => setSacando(miembro)}
                >
                  {copy.gente.remove}
                </Button>
              ) : null}
            </li>
          )
        })}
      </ul>

      {/* Las invitaciones van debajo de la gente y no en su propia sección: son las mismas
          personas, un paso antes. Separarlas obligaría a mirar dos bloques para contestar
          «¿quién tiene acceso a mi plata?». */}
      {puedoAdministrar ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">{copy.invitar.pending}</p>

          {invitaciones && invitaciones.length > 0 ? (
            <ul className="divide-y divide-border">
              {invitaciones.map((invitacion: Invitacion) => (
                <li key={invitacion.id} className="flex items-center gap-3 py-2">
                  <MailIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="num truncate text-sm">{invitacion.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {copy.invitar.expires(formatLongDate(enDia(invitacion.expiresAt)))}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={cancelar.isPending}
                    onClick={() => cancelar.mutate(invitacion.id)}
                  >
                    {copy.invitar.cancel}
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">{copy.invitar.none}</p>
          )}

          <div className="pt-1">
            <Invitar />
          </div>
        </div>
      ) : null}

      <AlertDialog open={sacando !== null} onOpenChange={(abierto) => !abierto && setSacando(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {copy.gente.removeTitle(sacando?.user.name || (sacando?.user.email ?? ''))}
            </AlertDialogTitle>
            <AlertDialogDescription>{copy.gente.removeHint}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{copy.vaciar.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (sacando) sacar.mutate(sacando.userId)
                setSacando(null)
              }}
            >
              {copy.gente.removeConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Seccion>
  )
}
