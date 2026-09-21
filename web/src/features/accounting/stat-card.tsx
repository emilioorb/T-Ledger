import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface Props {
  label: ReactNode
  children: ReactNode
  hint?: ReactNode
  icon?: LucideIcon
  className?: string
}

// La cifra que abre una pantalla, con su nombre encima y su explicación debajo. En tarjeta y
// no entre dos reglas: la regla separa, la tarjeta agrupa, y lo que hay acá es un grupo.
export const StatCard = ({ label, children, hint, icon: Icon, className }: Props) => (
  // `justify-center`: las tarjetas de una fila se estiran a la altura de la más alta, y sin
  // esto la cifra queda pegada arriba con un hueco debajo que parece un error de armado.
  <Card size="sm" className={cn('justify-center gap-1 px-4', className)}>
    {/* El icono acompaña al nombre, no a la cifra: el que manda es el número, y un icono
        de su tamaño le disputaría la mirada. */}
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {Icon ? <Icon className="size-3.5 shrink-0" aria-hidden="true" /> : null}
      {label}
    </p>
    {children}
    {hint ? <p className="max-w-[52ch] text-xs text-muted-foreground">{hint}</p> : null}
  </Card>
)

// La rejilla de arriba: la cifra principal ocupa el ancho que necesite y las de apoyo se
// acomodan al lado. Nunca es una fila de cuatro tarjetas iguales, que es la plantilla que
// DESIGN.md prohíbe: acá hay una que manda y las demás la explican.
//
// Tres columnas en `lg` y cuatro recién en `xl`: saltar de dos a cuatro a 1024 px dejaba
// 137 px de interior para montos de ~185 px, y como la tarjeta recorta, la cifra se cortaba
// sin barra ni aviso. La barra lateral se come 256 px que el breakpoint no ve.
export const StatGrid = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4', className)}>
    {children}
  </div>
)
