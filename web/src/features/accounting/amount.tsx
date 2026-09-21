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
export const Amount = ({ money, className, emphasis = 'normal', tone = 'plain' }: Props) => (
  <span
    className={cn(
      'num tabular-nums',
      emphasis === 'strong' && 'font-medium',
      tone === 'alert' && 'text-negative',
      className,
    )}
  >
    {formatMoney(money)}
  </span>
)

export const isZeroMoney = (money: Money): boolean => /^-?0+$/.test(money.minorUnits)

export const isNegativeMoney = (money: Money): boolean => money.minorUnits.startsWith('-')
