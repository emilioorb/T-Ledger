import { colorDe } from '@/components/color-picker'
import { cn } from '@/lib/utils'

export interface Tramo {
  id: string
  nombre: string
  // De 0 a 1. Se calcula afuera porque quien arma los tramos es el único que sabe contra qué
  // total se comparan.
  parte: number
  colorIndex?: number | null
  posicion?: number
  // Lo que se lee al pasar el mouse: nombre, monto y porcentaje. El color ordena, el texto
  // informa.
  detalle?: string
}

interface Props {
  tramos: Tramo[]
  label: string
  className?: string
}

// Una sola barra apilada para todo el producto. Estaba escrita dos veces, con un píxel de
// separación en una y sin él en la otra, y el mismo gasto se veía distinto según la pantalla.
//
// La hendidura entre tramos es del color del fondo y no un borde: marca el límite aunque dos
// categorías vecinas tengan colores parecidos, sin sumar una línea que compita con el dato.
export const BarraDeComposicion = ({ tramos, label, className }: Props) => (
  <div
    role="img"
    aria-label={label}
    className={cn('flex h-2 w-full gap-px overflow-hidden rounded-sm', className)}
  >
    {tramos.map((tramo, indice) => (
      <span
        key={tramo.id}
        title={tramo.detalle}
        className="first:rounded-l-sm last:rounded-r-sm"
        style={{
          width: `${tramo.parte * 100}%`,
          backgroundColor: colorDe(tramo.colorIndex, tramo.posicion ?? indice),
        }}
      />
    ))}
  </div>
)
