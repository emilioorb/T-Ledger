import { cn } from '@/lib/utils'
import { formatMoney } from '@/lib/money'
import type { Money } from './types'

interface Props {
  money: Money
  className?: string
  emphasis?: 'normal' | 'strong'
}

const isNegative = (money: Money): boolean => money.minorUnits.startsWith('-')

// El color aparece solo cuando significa algo: un saldo en contra. El resto de la
// jerarquía la hacen el peso y el tamaño, como manda la cinta de la sumadora.
export const Amount = ({ money, className, emphasis = 'normal' }: Props) => (
  <span
    className={cn(
      'num tabular-nums',
      emphasis === 'strong' && 'font-medium',
      isNegative(money) && 'text-negative',
      className,
    )}
  >
    {formatMoney(money)}
  </span>
)

export const isZeroMoney = (money: Money): boolean => /^-?0+$/.test(money.minorUnits)
