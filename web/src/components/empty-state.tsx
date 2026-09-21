import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  title: string
  description: string
  action?: ReactNode
  className?: string
}

// Las líneas de arriba y abajo lo separan del resto de la página. Dentro de un marco sobran,
// y el texto necesita el mismo respiro lateral que las filas: para eso está className.
export const EmptyState = ({ title, description, action, className }: Props) => (
  <div className={cn('border-y border-border py-10', className)}>
    <h2 className="text-base font-medium tracking-tight">{title}</h2>
    <p className="mt-1 max-w-[65ch] text-sm text-muted-foreground">{description}</p>
    {action ? <div className="mt-4">{action}</div> : null}
  </div>
)
