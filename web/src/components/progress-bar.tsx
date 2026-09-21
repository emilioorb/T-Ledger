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

// El relleno crece con `scaleX` y no con `width`: cambiar el ancho recalcula el layout en
// cada frame, escalar no toca nada. `origin-left` es lo que hace que crezca desde la
// izquierda en vez de estirarse desde el centro.
export const ProgressBar = ({ value, label, tone = 'plain', className }: Props) => (
  <div
    className={cn('h-1 w-full overflow-hidden bg-border-strong', className)}
    role="img"
    aria-label={label}
  >
    <div
      className={cn(
        'h-full w-full origin-left transition-transform duration-500 ease-(--ease-out-expo)',
        FILL[tone],
      )}
      style={{ transform: `scaleX(${Math.min(Math.max(value, 0), 1)})` }}
    />
  </div>
)
