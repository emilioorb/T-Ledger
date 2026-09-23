import { createFileRoute } from '@tanstack/react-router'
import { KeyRoundIcon } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { BorrarCuenta } from '@/features/cuenta/borrar-cuenta'
import { CabeceraDePerfil } from '@/features/cuenta/cabecera-de-perfil'
import { copy } from '@/features/cuenta/copy'
import { Seccion } from '@/features/cuenta/seccion'
import { TuApariencia } from '@/features/cuenta/tu-apariencia'
import { TuContrasena } from '@/features/cuenta/tu-contrasena'
import { TusLibros } from '@/features/cuenta/tus-libros'
import { useResumenDeInstancia, useSoyAdmin } from '@/features/datos/use-datos'
import { TusSesiones } from '@/features/cuenta/tus-sesiones'
import { useActiveOrganization, useSession } from '@/features/identity/auth-client'

// Solo el día: `formatLongDate` parte por guiones, y un ISO con hora le deja «06T21» en el
// día. El síntoma era «Desde el NaN de setiembre».
const enDia = (fecha: Date | string | undefined): string | null =>
  fecha === undefined ? null : new Date(fecha).toISOString().slice(0, 10)

// Un perfil, no un panel de configuración: arriba quién sos, con la mascota del color que
// elegiste y el nombre editable donde se lee. Abajo, en dos columnas desde `lg`, lo que se
// mira de vez en cuando —cómo se ve la aplicación— y lo que se mira cuando se sospecha algo
// —la contraseña y dónde está abierta la sesión—.
//
// Sin pestañas: son tres bloques que entran en una pantalla, y en pestañas habría que hacer
// tres clics para ver lo que ya está.
const CuentaScreen = () => {
  const { data: sesion, isPending } = useSession()
  const { data: activo } = useActiveOrganization()
  const { data: soyAdmin } = useSoyAdmin()
  // Solo se pide si administra: a quien no, el servidor le contestaría 403.
  const { data: instancia } = useResumenDeInstancia(soyAdmin?.admin === true)

  if (isPending || !sesion) {
    return <Skeleton className="h-96 w-full" aria-label={copy.title} />
  }

  const miembro = activo?.members?.find((m) => m.userId === sesion.user.id)

  return (
    <div className="space-y-4">
      <CabeceraDePerfil
        name={sesion.user.name}
        email={sesion.user.email}
        libro={activo?.name ?? null}
        rol={miembro?.role ?? null}
        desde={enDia(sesion.user.createdAt)}
        {...(soyAdmin?.admin ? { usuarios: instancia?.usuarios ?? null } : {})}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="grid content-start gap-4">
          <TusLibros activo={activo?.id ?? null} roles={copy.perfil.roles} />

          <TuApariencia />

          <Seccion title={copy.contrasena.title} hint={copy.contrasena.hint} icon={KeyRoundIcon}>
            <div>
              <TuContrasena />
            </div>
          </Seccion>
        </div>

        <div className="grid content-start gap-4">
          <TusSesiones tokenActual={sesion.session.token} />

          {/* Al final de todo, que es donde va lo que se hace una vez y sin vuelta atrás. */}
          <BorrarCuenta />
        </div>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/cuenta')({ component: CuentaScreen })
