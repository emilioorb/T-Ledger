import type { ComponentProps } from 'react'
import { Input } from '@/components/ui/input'
import { SYMBOL } from '@/lib/money'
import { cn } from '@/lib/utils'
import type { Moneda } from '../types'

interface Props extends ComponentProps<typeof Input> {
  moneda: Moneda
}

// La Regla de la Cifra Tabular en un campo: mono, a la derecha y con el símbolo adentro. El
// símbolo es solo visual; el nombre del campo ya dice la moneda.
export const Monto = ({ moneda, className, ...props }: Props) => (
  <div className="relative">
    <span aria-hidden="true" className="num pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-sm text-muted-foreground">
      {SYMBOL[moneda]}
    </span>
    <Input className={cn('num h-11 pl-7 text-right sm:h-9', className)} {...props} />
  </div>
)
