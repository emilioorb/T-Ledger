import { ArrowDown, ArrowUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { SortDirection } from '@/lib/use-table-controls'
import { cn } from 'cn'

interface Props<K extends string> {
  options: { key: K; label: string }[]
  value: K
  direction: SortDirection
  onChange: (key: K) => void
  onFlip: () => void
  // El punto de quiebre lo fija quien la usa: cada tabla pasa a lista en un ancho distinto.
  className?: string
}

// Bajo sm no hay encabezados de columna donde hacer clic, así que el orden necesita su
// propio control. Es el mismo estado, expuesto de otra forma.
export const SortSelect = <K extends string>({
  options,
  value,
  direction,
  onChange,
  onFlip,
  className,
}: Props<K>) => (
  <div className={cn('flex gap-1', className)}>
    <Select value={value} onValueChange={(next) => onChange(next as K)}>
      <SelectTrigger className="h-8 flex-1" aria-label="Ordenar por">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.key} value={option.key}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="size-8 shrink-0"
      onClick={onFlip}
      aria-label={direction === 'asc' ? 'Orden ascendente, invertir' : 'Orden descendente, invertir'}
    >
      {direction === 'asc' ? (
        <ArrowUp className="size-4" aria-hidden="true" />
      ) : (
        <ArrowDown className="size-4" aria-hidden="true" />
      )}
    </Button>
  </div>
)
