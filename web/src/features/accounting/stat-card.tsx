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

// La escala es la del sistema —1,875rem la cifra principal, 1,5rem las de apoyo— y solo
// cede cuando el monto de verdad no entra. Un patrimonio pasa de ocho a doce cifras sin
// avisar, y con tamaño fijo la cifra se cortaba sin barra ni aviso.
//
// El cálculo es exacto porque la fuente de las cifras es monoespaciada: N caracteres miden
// `N × 0,6em`, así que el tamaño más grande que entra es `100cqi / (N × 0,6)`. `cqi` ya
// mide el interior de la tarjeta, sin su relleno. `Amount` publica N en `--chars`. Sin esa variable el divisor queda
// en 0,6 y el resultado se va muy por arriba del tope, o sea que manda el tamaño fijo: las
// cifras que no son montos —una fecha, un porcentaje— no se tocan.
// Las clases van escritas enteras y no compuestas: Tailwind solo genera las que encuentra
// literales en el código.
const FIGURES = [
  '[&_.text-3xl]:text-[min(1.875rem,calc(100cqi/(var(--chars,1)*0.6)))]',
  '[&_.text-2xl]:text-[min(1.5rem,calc(100cqi/(var(--chars,1)*0.6)))]',
].join(' ')

// La cifra que abre una pantalla, con su nombre encima y su explicación debajo. En tarjeta y
// no entre dos reglas: la regla separa, la tarjeta agrupa, y lo que hay acá es un grupo.
export const StatCard = ({ label, children, hint, icon: Icon, className }: Props) => (
  // `justify-center`: las tarjetas de una fila se estiran a la altura de la más alta, y sin
  // esto la cifra queda pegada arriba con un hueco debajo que parece un error de armado.
  <Card size="sm" className={cn('@container justify-center gap-1 px-4', FIGURES, className)}>
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
// El ancho mínimo de una tarjeta lo decide el dato y no un breakpoint. Medido en el
// navegador sobre un monto de nueve cifras: 201 px en `text-2xl` y 240 px en `text-3xl`,
// más los 32 px de respiro de la tarjeta. 17rem cubre el caso más ancho.
//
// Con `auto-fit` la rejilla pone las columnas que entren sin apretar ninguna por debajo de
// eso: la cifra no se corta nunca y no hay que ajustar umbrales cada vez que aparece un
// monto más largo. La contrapartida es que una fila se parte cuando el ancho no alcanza,
// que es lo correcto: un monto es indivisible. Ver `lib/money.ts`.
const TRACK = 'grid-cols-[repeat(auto-fit,minmax(17rem,1fr))]'

export const StatGrid = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn('grid gap-3', TRACK, className)}>{children}</div>
)
