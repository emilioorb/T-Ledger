import { Amount } from './amount'
import type { Money } from './types'

export interface ExpenseSlice {
  id: string
  name: string
  amount: Money
}

// Los mismos cinco tonos de las cubetas del presupuesto: si el gasto de una categoría y el
// de su cubeta se pintaran distinto, la misma plata tendría dos colores en dos pantallas.
const TONES = [
  'var(--bucket-1)',
  'var(--bucket-2)',
  'var(--bucket-3)',
  'var(--bucket-4)',
  'var(--bucket-5)',
]

const toneOf = (index: number): string => TONES[index % TONES.length] ?? TONES[0]!

interface Props {
  slices: ExpenseSlice[]
  total: Money
  label: string
  totalLabel: string
  restLabel: string
}

// Más de cinco renglones y la lista deja de leerse de un vistazo, que es para lo que está.
// Lo que sobra no se esconde: se junta en una porción, y la barra sigue sumando el total.
const TOP = 5

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
      <div className="flex h-2 w-full overflow-hidden rounded-sm" role="img" aria-label={label}>
        {shown.map((slice, index) => (
          <div
            key={slice.id}
            style={{ width: `${share(slice.amount) * 100}%`, backgroundColor: toneOf(index) }}
          />
        ))}
      </div>

      <ul className="mt-4 space-y-2">
        {shown.map((slice, index) => (
          <li key={slice.id} className="flex items-baseline gap-2 text-sm">
            <span
              className="size-2 shrink-0 translate-y-px rounded-[2px]"
              style={{ backgroundColor: toneOf(index) }}
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
