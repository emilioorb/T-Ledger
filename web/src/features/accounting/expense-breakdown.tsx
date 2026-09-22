import { colorDe } from '@/components/color-picker'
import { Amount } from './amount'
import { BarraDeComposicion } from './barra-de-composicion'
import type { Money } from './types'

export interface ExpenseSlice {
  id: string
  name: string
  amount: Money
  // El color que eligió la categoría, y su lugar en el catálogo para cuando no eligió
  // ninguno. Sin esto, la categoría con su punto azul en el catálogo salía naranja acá: la
  // misma plata con dos colores en dos pantallas, que es lo que el color venía a evitar.
  colorIndex?: number | null
  posicion?: number
}

interface Props {
  slices: ExpenseSlice[]
  total: Money
  label: string
  totalLabel: string
  restLabel: string
}

// Tres categorías y el resto agrupado: cuatro renglones. La lista está para contestar «en qué
// se fue el mes» de un vistazo, y a partir del cuarto nombre eso deja de ser un vistazo y pasa
// a ser una lectura —para eso está el enlace a los movimientos—.
//
// Lo que sobra no se esconde: se junta en una porción que dice cuántas son, y la barra sigue
// sumando el total, así que los porcentajes nunca mienten.
const TOP = 4

const groupRest = (slices: ExpenseSlice[], restLabel: string): ExpenseSlice[] => {
  if (slices.length <= TOP) return slices

  const rest = slices.slice(TOP - 1)
  const minorUnits = rest
    .reduce((total, slice) => total + BigInt(slice.amount.minorUnits), 0n)
    .toString()

  return [
    ...slices.slice(0, TOP - 1),
    {
      id: 'otras',
      name: `${restLabel} (${rest.length})`,
      amount: { minorUnits, currency: rest[0]?.amount.currency ?? 'CRC' },
    },
  ]
}

// Una barra y no un anillo: lo que se compara son longitudes, y el ojo compara longitudes
// mucho mejor que ángulos. Además la barra ocupa el ancho que ya tiene el panel, mientras
// que el círculo obliga a reservarle un cuadrado.
export const ExpenseBreakdown = ({ slices, total, label, totalLabel, restLabel }: Props) => {
  const shown = groupRest(slices, restLabel)
  const totalMinor = Number(total.minorUnits)
  const share = (amount: Money): number =>
    totalMinor > 0 ? Number(amount.minorUnits) / totalMinor : 0

  return (
    <div className="flex flex-1 flex-col">
      <BarraDeComposicion
        label={label}
        tramos={shown.map((slice, index) => ({
          id: slice.id,
          nombre: slice.name,
          parte: share(slice.amount),
          colorIndex: slice.colorIndex ?? null,
          posicion: slice.posicion ?? index,
        }))}
      />

      <ul className="mt-4 space-y-2">
        {shown.map((slice, index) => (
          <li key={slice.id} className="flex items-baseline gap-2 text-sm">
            <span
              className="size-2 shrink-0 translate-y-px rounded-[2px]"
              style={{ backgroundColor: colorDe(slice.colorIndex, slice.posicion ?? index) }}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1 truncate">{slice.name}</span>
            <Amount money={slice.amount} />
            <span className="num w-10 shrink-0 text-right text-xs text-muted-foreground">
              {totalMinor > 0 ? `${Math.round(share(slice.amount) * 100)}%` : '—'}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-auto flex items-baseline justify-between gap-3 border-t border-border pt-3 text-sm">
        <span className="text-muted-foreground">{totalLabel}</span>
        <Amount money={total} emphasis="strong" />
      </div>
    </div>
  )
}
