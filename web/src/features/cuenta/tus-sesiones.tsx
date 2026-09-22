import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MonitorIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { FormDialog } from '@/components/form-dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { auth } from '@/features/identity/auth-client'
import { formatLongDate } from '@/lib/dates'
import { describirAparato } from './aparato'
import { copy } from './copy'
import { Seccion } from './seccion'

interface Sesion {
  id: string
  token: string
  userAgent?: string | null
  createdAt: Date | string
  expiresAt: Date | string
}

// Cuántas caben en la sección sin empujar el resto de la pantalla. Más que esto no es
// información, es una lista: se va al modal, donde hay lugar para leerla entera.
const A_LA_VISTA = 4

const enIso = (fecha: Date | string): string =>
  (typeof fecha === 'string' ? new Date(fecha) : fecha).toISOString()

// Solo el día: `formatLongDate` parte por guiones y con la hora adentro devuelve «NaN».
const enDia = (fecha: Date | string): string => enIso(fecha).slice(0, 10)

interface FilaProps {
  sesion: Sesion
  esLaActual: boolean
  cerrando: boolean
  onCerrar: () => void
}

const Fila = ({ sesion, esLaActual, cerrando, onCerrar }: FilaProps) => (
  <li className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
    <MonitorIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />

    <div className="min-w-0 flex-1">
      <p className="truncate text-sm">
        {describirAparato(sesion.userAgent) ?? copy.sesiones.unknown}
        {/* La actual va con etiqueta y no con un color: es la única fila que no se puede
            cerrar, y eso tiene que leerse sin distinguir tonos. */}
        {esLaActual ? (
          <span className="ml-2 text-xs text-muted-foreground">· {copy.sesiones.current}</span>
        ) : null}
      </p>
      <p className="num text-xs text-muted-foreground">
        {copy.sesiones.since(formatLongDate(enDia(sesion.createdAt)))}
      </p>
    </div>

    {esLaActual ? null : (
      <Button type="button" variant="ghost" size="sm" disabled={cerrando} onClick={onCerrar}>
        {copy.sesiones.close}
      </Button>
    )}
  </li>
)

// Dónde está abierta tu sesión. Es la pareja del vigilante de inactividad: ese defiende la
// computadora que dejaste sin bloquear, y esta la que dejaste en otro lado.
//
// No lleva la dirección IP aunque Better Auth la guarde. En este producto la IP no contesta
// «¿esta sesión soy yo?» mejor que el navegador y el sistema, y sí agrega un dato personal a
// una pantalla que no lo necesita.
export const TusSesiones = ({ tokenActual }: { tokenActual: string | undefined }) => {
  const cliente = useQueryClient()
  const [viendoTodas, setViendoTodas] = useState(false)
  const clave = ['identity', 'sessions'] as const

  const { data, isPending } = useQuery({
    queryKey: clave,
    queryFn: async () => {
      const { data: sesiones, error } = await auth.listSessions()
      if (error) throw new Error(error.message)
      return (sesiones ?? []) as Sesion[]
    },
  })

  const cerrar = useMutation({
    mutationFn: async (token: string | null) => {
      const respuesta = token
        ? await auth.revokeSession({ token })
        : await auth.revokeOtherSessions()
      if (respuesta.error) throw new Error(respuesta.error.message)
    },
    onSuccess: (_, token) => {
      toast.success(token ? copy.sesiones.closed : copy.sesiones.closedOthers)
      void cliente.invalidateQueries({ queryKey: clave })
    },
    onError: () => toast.error(copy.sesiones.failed),
  })

  // La actual primero y el resto por antigüedad: la que uno busca es la que no reconoce, y
  // para encontrarla hay que poder descartar rápido la propia.
  const sesiones = [...(data ?? [])].sort((a, b) => {
    if (a.token === tokenActual) return -1
    if (b.token === tokenActual) return 1
    return enIso(b.createdAt).localeCompare(enIso(a.createdAt))
  })

  const otras = sesiones.filter((sesion) => sesion.token !== tokenActual).length
  const ocultas = Math.max(sesiones.length - A_LA_VISTA, 0)

  const fila = (sesion: Sesion) => (
    <Fila
      key={sesion.id}
      sesion={sesion}
      esLaActual={sesion.token === tokenActual}
      cerrando={cerrar.isPending}
      onCerrar={() => cerrar.mutate(sesion.token)}
    />
  )

  return (
    <Seccion title={copy.sesiones.title} hint={copy.sesiones.hint} icon={MonitorIcon}>
      {isPending ? (
        <Skeleton className="h-16 w-full" aria-label={copy.sesiones.loading} />
      ) : (
        <>
          {/* Cuatro y el resto en un modal, en vez de una lista con scroll propio: una caja
              que se desplaza por dentro esconde cuántas hay, y acá el número es el dato
              —«tengo once sesiones abiertas» es justo lo que enciende la alarma—. */}
          <ul className="divide-y divide-border">{sesiones.slice(0, A_LA_VISTA).map(fila)}</ul>

          <div className="flex flex-wrap items-center gap-2">
            {ocultas > 0 ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => setViendoTodas(true)}>
                {copy.sesiones.seeAll(sesiones.length)}
              </Button>
            ) : null}

            {otras > 0 ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={cerrar.isPending}
                onClick={() => cerrar.mutate(null)}
              >
                {cerrar.isPending ? copy.sesiones.closing : copy.sesiones.closeOthers}
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">{copy.sesiones.alone}</p>
            )}
          </div>

          <FormDialog
            open={viendoTodas}
            onOpenChange={setViendoTodas}
            title={copy.sesiones.allTitle}
            description={copy.sesiones.allHint(sesiones.length)}
            icon={MonitorIcon}
          >
            {/* Acá sí con scroll: el modal ya dijo cuántas son en su encabezado, así que la
                caja no esconde el número. */}
            <ul className="max-h-[50vh] divide-y divide-border overflow-y-auto">
              {sesiones.map(fila)}
            </ul>
          </FormDialog>
        </>
      )}
    </Seccion>
  )
}
