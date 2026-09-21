import { cn } from '@/lib/utils'

export type ProgressTone = 'plain' | 'warning' | 'positive'

interface Props {
  // Entre 0 y 1. Se recorta acá: un presupuesto pasado da más de 1 y la barra no puede
  // desbordar su carril.
  value: number
  // Obligatoria: la barra es la única forma de leer el dato para quien no la ve. Sin
  // etiqueta, `role="img"` anuncia una imagen vacía.
  label: string
  tone?: ProgressTone
  className?: string
}

const FILL: Record<ProgressTone, string> = {
  plain: 'bg-foreground',
  warning: 'bg-warning',
  positive: 'bg-positive',
}

export const ProgressBar = ({ value, label, tone = 'plain', className }: Props) => (
  <div className={cn('h-1 w-full bg-border-strong', className)} role="img" aria-label={label}>
    <div
      className={cn('h-full', FILL[tone])}
      style={{ width: `${Math.min(Math.max(value, 0), 1) * 100}%` }}
    />
  </div>
)
