import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { copy } from '@/features/shell/copy'
import type { SortDirection } from '@/lib/use-table-controls'
import { cn } from 'cn'

interface Props {
  label: string
  active: boolean
  direction: SortDirection
  align?: 'left' | 'right'
  className?: string
  onClick: () => void
}

// El nombre accesible dice qué hace el botón y en qué estado está, porque estas listas
// no son tablas semánticas y no hay aria-sort donde apoyarse.
export const SortButton = ({
  label,
  active,
  direction,
  align = 'left',
  className,
  onClick,
}: Props) => {
  const Icon = !active ? ChevronsUpDown : direction === 'asc' ? ArrowUp : ArrowDown
  const { sort } = copy.controls
  const estado = active ? (direction === 'asc' ? sort.ascending : sort.descending) : sort.unsorted

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={sort.label(label, estado)}
      className={cn(
        'inline-flex min-h-6 items-center gap-1 rounded-sm transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-(--duration-press) ease-(--ease-out-quart) hover:text-foreground active:translate-y-px',
        active && 'text-foreground',
        align === 'right' && 'flex-row-reverse',
        className,
      )}
    >
      <span>{label}</span>
      <Icon className="size-3 opacity-60" aria-hidden="true" />
    </button>
  )
}
