import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface PagerLabels {
  previous: string
  next: string
  range: (from: number, to: number, total: number) => string
}

interface Props {
  page: number
  pageSize: number
  totalItems: number
  labels: PagerLabels
  onPage: (page: number) => void
}

// Una lista que dice «142» y muestra veinte sin avisar miente por omisión. El paginador
// nombra el tramo que se está viendo, no solo el número de página: lo que importa es
// cuánto falta por revisar, no en qué página se está.
export const Pager = ({ page, pageSize, totalItems, labels, onPage }: Props) => {
  const totalPages = Math.max(Math.ceil(totalItems / pageSize), 1)
  if (totalPages <= 1) return null

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, totalItems)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
      <span className="num text-xs text-muted-foreground">
        {labels.range(from, to, totalItems)}
      </span>
      <span className="flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          <ChevronLeft className="size-3.5" aria-hidden="true" />
          {labels.previous}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
        >
          {labels.next}
          <ChevronRight className="size-3.5" aria-hidden="true" />
        </Button>
      </span>
    </div>
  )
}
