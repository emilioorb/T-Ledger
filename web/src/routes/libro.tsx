import { createFileRoute } from '@tanstack/react-router'
import { BookIcon } from 'lucide-react'
import { useState } from 'react'
import { EmptyState } from '@/components/empty-state'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Seccion } from '@/features/cuenta/seccion'
import { useActiveOrganization, useSession } from '@/features/identity/auth-client'
import { copy } from '@/features/libro/copy'
import { LaGente, type Miembro } from '@/features/libro/la-gente'
import { EliminarElLibro } from '@/features/libro/eliminar-el-libro'
import { useMisLibros, useRenombrarLibro } from '@/features/libro/use-libro'
import { VaciarElLibro } from '@/features/libro/vaciar-el-libro'
import { copy as shell } from '@/features/shell/copy'

// El nombre se edita donde se lee, igual que en el perfil: guarda al salir del campo o con
// Enter, y no hay botón «Guardar» para un solo campo.
const NombreDelLibro = ({ id, nombre }: { id: string; nombre: string }) => {
  const [valor, setValor] = useState(nombre)
  const renombrar = useRenombrarLibro()

  const guardar = () => {
    const limpio = valor.trim()
    if (limpio === '' || limpio === nombre) return setValor(nombre)
    renombrar.mutate({ organizationId: id, name: limpio })
  }

  return (
    <Seccion title={copy.nombre.label} hint={copy.nombre.hint} icon={BookIcon}>
      <div className="space-y-1.5 sm:max-w-sm">
        <Label htmlFor="nombre-libro" className="sr-only">
          {copy.nombre.label}
        </Label>
        <Input
          id="nombre-libro"
          value={valor}
          disabled={renombrar.isPending}
          onChange={(evento) => setValor(evento.target.value)}
          onBlur={guardar}
          onKeyDown={(evento) => {
            if (evento.key === 'Enter') evento.currentTarget.blur()
            if (evento.key === 'Escape') setValor(nombre)
          }}
        />
      </div>
    </Seccion>
  )
}

// El libro, no vos: quién entra, cómo se llama y cómo empezar de nuevo. Lo de acá es de este
// libro y cambia si mañana hay otro; lo de `/cuenta` sos vos, y es igual en todos.
const LibroScreen = () => {
  const { data: sesion } = useSession()
  const { data: activo, isPending } = useActiveOrganization()
  const { data: libros } = useMisLibros()

  if (isPending) return <Skeleton className="h-96 w-full" aria-label={copy.title} />

  // Sin libro activo no hay nada que administrar. Pasa en una instancia recién levantada,
  // antes de crear el primero.
  if (!activo || !sesion) {
    return <EmptyState title={shell.nav.noBook} description={copy.description} />
  }

  const miembros = (activo.members ?? []) as Miembro[]
  const yo = miembros.find((miembro) => miembro.userId === sesion.user.id)
  const puedoAdministrar = yo?.role === 'owner'

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{activo.name}</h1>
        <p className="mt-1 max-w-[70ch] text-sm text-balance text-muted-foreground">
          {copy.description}
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <LaGente miembros={miembros} soyYo={sesion.user.id} puedoAdministrar={puedoAdministrar} />

        {/* Las dos cosas que solo el dueño puede hacer van juntas y a un lado: el nombre
            porque es identidad, y vaciar y eliminar porque son lo último que uno mira. */}
        {puedoAdministrar ? (
          <div className="grid content-start gap-4">
            <NombreDelLibro id={activo.id} nombre={activo.name} />
            <VaciarElLibro nombre={activo.name} />
            <EliminarElLibro nombre={activo.name} unico={(libros?.length ?? 1) <= 1} />
          </div>
        ) : null}
      </div>
    </div>
  )
}

export const Route = createFileRoute('/libro')({ component: LibroScreen })
