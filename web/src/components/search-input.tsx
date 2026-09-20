import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder: string
  label: string
}

export const SearchInput = ({ value, onChange, placeholder, label }: Props) => (
  <div className="relative w-full sm:max-w-xs">
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
        aria-label="Limpiar la búsqueda"
        className="absolute top-1/2 right-1 grid size-6 -translate-y-1/2 place-items-center rounded-sm text-muted-foreground hover:text-foreground"
      >
        <X className="size-3.5" aria-hidden="true" />
      </button>
    ) : null}
  </div>
)
