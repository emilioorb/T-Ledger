import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'

interface Props {
  title: string
  hint: string
  // El mismo recurso que usan los paneles del tablero y los modales: el ícono nombra de qué
  // es la sección antes de que se lea el título, que es lo que permite saltar directo a la
  // que se vino a buscar.
  icon: LucideIcon
  children: ReactNode
}

// Las cuatro secciones de la pantalla de cuenta comparten el mismo encabezado: un título, una
// línea que explica el alcance y el contenido debajo. Vive acá porque cuatro copias del mismo
// bloque se desalinean a la primera corrección, y porque la línea de ayuda es parte de la
// sección, no un adorno: cada una aclara algo que si no habría que adivinar —que el nombre
// firma el registro, que el tema es de este navegador, qué hacer con una sesión rara—.
export const Seccion = ({ title, hint, icon: Icon, children }: Props) => (
  <Card size="sm" className="gap-4 px-4">
    <header>
      <h2 className="flex items-center gap-2 text-base font-medium tracking-tight">
        <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        {title}
      </h2>
      <p className="mt-0.5 max-w-[70ch] text-xs text-muted-foreground">{hint}</p>
    </header>

    {children}
  </Card>
)
