import { TrendingDown, TrendingUp } from 'lucide-react'
import { isZeroMoney } from '@/features/accounting/amount'
import type { Money } from '@/features/accounting/types'
import { cn } from '@/lib/utils'

// Qué significa que una cifra suba. En patrimonio o ahorro, subir es bueno; en deuda, subir
// es malo. Lo decide la pantalla que sabe qué mide la cifra, no el signo del número.
export type DeltaMeaning = 'more-is-better' | 'less-is-better' | 'neutral'

interface Props {
  // Los dos extremos. `null` en cualquiera de los dos significa que el dato no llegó: sin
  // ambos no hay comparación, y un cero prestado diría que no cambió nada.
  now: Money | null | undefined
  before: Money | null | undefined
  meaning?: DeltaMeaning
  // Contra qué se compara, en palabras. Ej.: «que el mes pasado».
  against: string
  // Qué decir cuando no se movió nada.
  unchanged: string
  // Qué decir cuando el mes pasado era cero: un porcentaje contra cero no existe.
  fromZero: string
}

// El porcentaje se calcula sobre el valor absoluto de la base: con un patrimonio negativo,
// dividir por el signo daría una flecha que apunta al revés de lo que pasó.
const percentChange = (now: Money, before: Money): number | null => {
  const base = BigInt(before.minorUnits)
  if (base === 0n) return null
  const diff = BigInt(now.minorUnits) - base
  const abs = base < 0n ? -base : base
  return (Number(diff) / Number(abs)) * 100
}

// El signo va adelante y el símbolo pegado: «+4,8%». Un decimal mientras el cambio es chico
// y entero cuando ya se nota, porque «0%» perdería lo que «0,4%» dice y «12,3%» es precisión
// que nadie usa. La coma decimal es la del resto de la app.
const format = (percent: number): string => {
  const abs = Math.abs(percent)
  const rounded = abs < 10 ? abs.toFixed(1) : String(Math.round(abs))
  return `${percent > 0 ? '+' : '−'}${rounded.replace('.', ',')}%`
}

export const Delta = ({
  now,
  before,
  meaning = 'neutral',
  against,
  unchanged,
  fromZero,
}: Props) => {
  if (!now || !before) return null

  const percent = percentChange(now, before)
  if (percent === null) {
    // Sin base no hay porcentaje: se dice qué pasó en palabras en vez de inventar un número.
    return (
      <span className="text-xs text-muted-foreground">
        {isZeroMoney(now) ? unchanged : fromZero}
      </span>
    )
  }

  if (Math.abs(percent) < 0.05) {
    return <span className="text-xs text-muted-foreground">{unchanged}</span>
  }

  const rose = percent > 0
  const Icon = rose ? TrendingUp : TrendingDown
  const good = meaning === 'more-is-better' ? rose : !rose
  const tone =
    meaning === 'neutral' ? 'text-muted-foreground' : good ? 'text-positive' : 'text-warning'

  return (
    <span className={cn('flex flex-wrap items-baseline gap-x-1 text-xs', tone)}>
      <Icon className="size-3 shrink-0 self-center" aria-hidden="true" />
      <span className="num font-medium">{format(percent)}</span>
      <span className="text-muted-foreground">{against}</span>
    </span>
  )
}
