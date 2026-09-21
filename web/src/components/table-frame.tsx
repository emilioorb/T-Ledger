import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  className?: string
  children: ReactNode
}

// Una tabla suelta sobre la página deja los bordes de las filas colgando en el aire. El marco
// las cierra: la última fila no corta el borde de abajo y las esquinas redondeadas recortan lo
// que sobresalga. El encabezado se separa con una línea, no con un fondo: pintarlo sería meter
// un tono que la pantalla no necesita.
//
// Sirve para las dos familias de tabla del proyecto: la de <table> —a la que le ajusta el
// encabezado y el respiro de las celdas— y la de grilla, que trae su propio FrameHeader
// porque las columnas las define cada pantalla.
//
// `overflow-x-auto` y no `overflow-hidden`: con el recorte, una tabla más ancha que la
// pantalla perdía las últimas columnas sin barra ni aviso. Desplazar molesta; recortar miente.
export const TableFrame = ({ className, children }: Props) => (
  <div
    className={cn(
      'overflow-x-auto rounded-lg border border-border',
      '[&_thead_tr]:border-border',
      '[&_th]:h-9 [&_th]:px-3 [&_td]:px-3 [&_td]:py-2.5',
      '[&_tbody_tr]:border-border [&_tbody_tr:last-child]:border-0',
      className,
    )}
  >
    {children}
  </div>
)

export const FRAME_ROW = 'px-3 py-2.5'

export const FrameHeader = ({ className, children }: Props) => (
  <div
    className={cn(
      'border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground',
      className,
    )}
  >
    {children}
  </div>
)
