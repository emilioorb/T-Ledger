import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'
import { formatMoney } from '@/lib/money'
import type { Money } from './types'

interface Props {
  money: Money
  className?: string
  emphasis?: 'normal' | 'strong'
  tone?: 'plain' | 'alert'
}

// El signo menos ya sostiene el dato: un patrimonio negativo o una pérdida del período
// no son una alerta, son un hecho. El color lo decide quien sabe qué significa la cifra
// en su pantalla, no el signo, porque un rojo que aparece siempre deja de avisar.
//
// `--chars` publica cuántos caracteres mide el monto ya formateado. La fuente de las cifras
// es monoespaciada, así que el ancho es exactamente `caracteres × 0,6em`: con ese dato, una
// tarjeta puede calcular si la cifra entra y achicarla solo si no. Ver `StatCard`.
export const Amount = ({ money, className, emphasis = 'normal', tone = 'plain' }: Props) => {
  const text = formatMoney(money)

  return (
    <span
      className={cn(
        'num num-right tabular-nums',
        emphasis === 'strong' && 'font-medium',
        tone === 'alert' && 'text-negative',
        className,
      )}
      style={{ '--chars': text.length } as CSSProperties}
    >
      {text}
    </span>
  )
}

export const isZeroMoney = (money: Money): boolean => /^-?0+$/.test(money.minorUnits)

export const isNegativeMoney = (money: Money): boolean => money.minorUnits.startsWith('-')
