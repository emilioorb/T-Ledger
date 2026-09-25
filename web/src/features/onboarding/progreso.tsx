import { cn } from '@/lib/utils'
import { copy } from './copy'

interface Props {
  actual: number
  total: number
}

const tramo = (numero: number, actual: number) => {
  if (numero < actual) return 'bg-foreground'
  if (numero === actual) return 'bg-foreground opacity-60'
  return 'bg-border'
}

export const Progreso = ({ actual, total }: Props) => (
  <div
    role="progressbar"
    aria-label={copy.progreso}
    aria-valuemin={1}
    aria-valuemax={total}
    aria-valuenow={actual}
    aria-valuetext={copy.pasoDe(actual, total)}
    className="flex flex-1 items-center gap-3"
  >
    <div className="flex flex-1 gap-1">
      {Array.from({ length: total }, (_, indice) => (
        <span key={indice} className={cn('h-1 flex-1 rounded-full', tramo(indice + 1, actual))} />
      ))}
    </div>
    <span className="num text-xs text-muted-foreground">{copy.deTotal(actual, total)}</span>
  </div>
)
