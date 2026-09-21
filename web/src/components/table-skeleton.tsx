import { Skeleton } from '@/components/ui/skeleton'
import { TableFrame } from '@/components/table-frame'

interface Props {
  rows?: number
  label: string
}

// Siete pantallas tenían siete alturas de esqueleto y ninguna dentro del marco, así que al
// llegar los datos la página saltaba. Una fila de carga mide lo que una fila real —dos veces
// y media el respiro vertical más el texto— y vive dentro del mismo marco.
export const TableSkeleton = ({ rows = 6, label }: Props) => (
  <TableFrame>
    <ul className="divide-y divide-border" role="status" aria-label={label}>
      {Array.from({ length: rows }, (_, index) => (
        <li key={index} className="px-3 py-2.5">
          <Skeleton className="h-5 w-full" />
        </li>
      ))}
    </ul>
  </TableFrame>
)
