import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { copy } from '@/features/shell/copy'
import { cn } from '@/lib/utils'

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder: string
  label: string
  className?: string
}

export const SearchInput = ({ value, onChange, placeholder, label, className }: Props) => (
  <div className={cn('relative w-full', className ?? 'sm:max-w-xs')}>
    <Search
      className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
      aria-hidden="true"
    />
    <Input
      type="search"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      aria-label={label}
      className="h-8 pr-8 pl-8"
    />
    {value ? (
      <button
        type="button"
        onClick={() => onChange('')}
        aria-label={copy.controls.clearSearch}
        className="absolute top-1/2 right-1 grid size-6 -translate-y-1/2 place-items-center rounded-sm text-muted-foreground transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-(--duration-press) ease-(--ease-out-quart) hover:text-foreground active:scale-95"
      >
        <X className="size-3.5" aria-hidden="true" />
      </button>
    ) : null}
  </div>
)
