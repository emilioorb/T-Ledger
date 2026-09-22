import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { LibraryIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { organization } from '@/features/identity/auth-client'
import { apiFetch } from '@/lib/api'
import type { components } from '@/lib/api-types.gen'
import { formatLongDate } from '@/lib/dates'
import { copy } from './copy'
import { CrearLibro } from './crear-libro'
import { Seccion } from './seccion'

type LibroPropio = components['schemas']['LibroPropio']

interface Props {
  activo: string | null
  roles: Record<string, string>
}

const enDia = (fecha: Date | string) => new Date(fecha).toISOString().slice(0, 10)

// A qué libros pertenecés y en cuál estás parado. Es también la puerta que faltaba para
// cambiar de libro: hasta ahora el primero se elegía solo y no había dónde decir otra cosa.
//
// El rol se muestra únicamente en el activo, y no por pereza: el listado de Better Auth
// devuelve los libros sin la membresía, así que el rol en los demás habría que adivinarlo o
// pedir cada libro por separado. Inventarlo sería peor que no ponerlo.
// Tres: el mismo tope que hace cumplir el servidor. Está repetido acá a propósito y no
// pedido por la API: es para apagar un botón, no para autorizar nada.
const TOPE = 3

export const TusLibros = ({ activo, roles }: Props) => {
  // El endpoint propio y no `listOrganizations` de Better Auth: aquel devuelve los libros sin
  // la membresía, y acá hacen falta las dos cosas —qué sos en cada uno y cuántos son tuyos—.
  const { data: libros, isPending } = useQuery({
    queryKey: ['identity', 'my-books'],
    queryFn: () => apiFetch<LibroPropio[]>('/book/mine'),
  })
  const [entrando, setEntrando] = useState<string | null>(null)
  const propios = (libros ?? []).filter((libro) => libro.role === 'owner').length

  const entrar = async (organizationId: string, nombre: string) => {
    setEntrando(organizationId)
    const { error } = await organization.setActive({ organizationId })
    setEntrando(null)

    if (error) return toast.error(copy.libros.failed)

    toast.success(copy.libros.switched(nombre))
    // Recarga entera, igual que al cerrar sesión y por el mismo motivo: en memoria quedan los
    // saldos, los movimientos y las metas del libro anterior, y mostrarlos un instante bajo
    // el nombre del nuevo sería mezclar dos contabilidades en pantalla.
    window.location.assign('/')
  }

  return (
    <Seccion title={copy.libros.title} hint={copy.libros.hint} icon={LibraryIcon}>
      {isPending ? (
        <Skeleton className="h-16 w-full" aria-label={copy.libros.loading} />
      ) : libros && libros.length > 0 ? (
        <ul className="divide-y divide-border">
          {libros.map((libro) => {
            const esElActivo = libro.id === activo

            return (
              <li key={libro.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">
                    {libro.name}
                    {esElActivo ? (
                      <span className="ml-2 text-xs text-muted-foreground">
                        · {copy.libros.here}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {roles[libro.role] ? `${roles[libro.role]} · ` : ''}
                    {copy.libros.since(formatLongDate(enDia(libro.createdAt)))}
                  </p>
                </div>

                {esElActivo ? (
                  <Button asChild type="button" variant="ghost" size="sm">
                    <Link to="/libro">{copy.libros.manage}</Link>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={entrando !== null}
                    onClick={() => void entrar(libro.id, libro.name)}
                  >
                    {entrando === libro.id ? copy.libros.switching : copy.libros.enter}
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">{copy.libros.none}</p>
      )}

      {isPending ? null : <CrearLibro lleno={propios >= TOPE} />}
    </Seccion>
  )
}
