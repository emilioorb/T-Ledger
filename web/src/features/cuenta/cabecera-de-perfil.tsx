import { UsersIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { copy as datos } from '@/features/datos/copy'
import { auth } from '@/features/identity/auth-client'
import { Bloub } from '@/features/shell/bloub'
import { formatLongDate } from '@/lib/dates'
import { copy } from './copy'

interface Props {
  name: string
  email: string
  libro: string | null
  rol: string | null
  desde: string | null
  // Cuánta gente tiene cuenta en esta instancia. Solo llega cuando quien mira la administra:
  // `undefined` es «no sos admin» y `null` es «todavía no llegó el número».
  usuarios?: number | null
}

type Rol = keyof typeof copy.perfil.roles

const nombreDelRol = (rol: string | null): string | null =>
  rol && rol in copy.perfil.roles ? copy.perfil.roles[rol as Rol] : null

// La cabecera del perfil, y no un formulario con un campo «Nombre» y un botón «Guardar».
//
// El nombre se edita donde se lee: el input no tiene marco hasta que lo tocás, y guarda al
// salir o con Enter. Es la diferencia entre una pantalla que te muestra quién sos y una que
// te pide que llenes un formulario para decírtelo.
export const CabeceraDePerfil = ({ name, email, libro, rol, desde, usuarios }: Props) => {
  const [nombre, setNombre] = useState(name)
  const [guardando, setGuardando] = useState(false)

  const guardar = async () => {
    const limpio = nombre.trim()
    if (limpio === '' || limpio === name || guardando) return setNombre(name)

    setGuardando(true)
    await auth.updateUser(
      { name: limpio },
      {
        onSuccess: () => {
          toast.success(copy.perfil.saved)
        },
        onError: () => {
          toast.error(copy.perfil.failed)
          setNombre(name)
        },
      },
    )
    setGuardando(false)
  }

  const marcas = [libro, nombreDelRol(rol), desde ? copy.perfil.since(formatLongDate(desde)) : null]

  return (
    <header className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="flex flex-col gap-5 px-5 py-6 sm:flex-row sm:items-center sm:gap-6 sm:px-6">
        {/* Nimbo hace de avatar hasta que haya foto: es lo que ya identifica a este producto,
            y del color que la persona eligió dos bloques más abajo. */}
        <Bloub gesto="contento" className="h-auto w-20 shrink-0 sm:w-24" />

        <div className="min-w-0 flex-1">
          <label htmlFor="nombre" className="sr-only">
            {copy.perfil.nameLabel}
          </label>
          {/* Sin `border` hasta el hover o el foco: en reposo es un título, y al acercarse
              avisa que se puede escribir. El ancho es el del texto, no el de la columna, así
              que el marco no se estira media pantalla. */}
          <input
            id="nombre"
            value={nombre}
            disabled={guardando}
            onChange={(evento) => setNombre(evento.target.value)}
            onBlur={() => void guardar()}
            onKeyDown={(evento) => {
              if (evento.key === 'Enter') evento.currentTarget.blur()
              if (evento.key === 'Escape') setNombre(name)
            }}
            className="w-full max-w-md rounded-md border border-transparent bg-transparent px-2 py-1 -ml-2 text-2xl font-semibold tracking-tight transition-colors duration-(--duration-press) ease-(--ease-out-quart) hover:border-border-subtle focus:border-border-strong focus:outline-none sm:text-3xl"
          />

          <p className="num mt-1 truncate text-sm text-muted-foreground">{email}</p>

          {/* Dónde estás parado, en una línea: el libro, qué podés hacer en él y desde cuándo
              existís. Separadas por puntos y no en tres renglones, porque son tres datos
              cortos que se leen de una. */}
          <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            {marcas.filter(Boolean).map((marca, indice) => (
              <span key={marca} className="flex items-center gap-2">
                {indice > 0 ? <span aria-hidden="true">·</span> : null}
                {marca}
              </span>
            ))}
          </p>
        </div>

        {/* La otra mitad de la misma tarjeta, separada por una regla y solo para quien
            administra la instancia: son números del servidor entero, no de este perfil, y por
            eso van del otro lado de la línea en vez de mezclarse con el nombre. */}
        {usuarios !== undefined ? (
          <div className="border-t border-border pt-4 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <UsersIcon className="size-3.5 shrink-0" aria-hidden="true" />
              {datos.usuarios}
            </p>
            {usuarios === null ? (
              <Skeleton className="mt-1 h-9 w-14" aria-label={datos.loading} />
            ) : (
              <p className="num mt-1 text-3xl leading-none font-semibold tabular-nums">
                {usuarios}
              </p>
            )}
            <p className="mt-1 max-w-[28ch] text-xs text-muted-foreground">{datos.usuariosHint}</p>
          </div>
        ) : null}
      </div>
    </header>
  )
}
