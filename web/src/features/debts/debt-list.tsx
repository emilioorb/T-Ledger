import { Link } from '@tanstack/react-router'
import { Skeleton } from '@/components/ui/skeleton'
import { formatIsoDate } from '@/lib/dates'
import { formatMoney } from '@/lib/money'
import { copy } from './copy'
import { EmptyState } from './empty-state'
import { ErrorState } from './error-state'
import type { Debt, DebtDirection } from './types'
import { useDebts } from './use-debts'

interface Props {
  direction: DebtDirection
  emptyAction?: React.ReactNode
}

// Encabezado y filas comparten la misma plantilla de columnas, con la última de ancho
// fijo: con `auto` cada grilla la resuelve por su cuenta y las cifras dejan de alinear.
// Solo las columnas, sin el display: el encabezado se oculta bajo sm y la fila no.
const COLS =
  'grid-cols-[1fr_auto] gap-x-4 gap-y-1 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_6.5rem]'

const Row = ({ debt }: { debt: Debt }) => (
  <li>
    <Link
      to="/deudas/$debtId"
      params={{ debtId: debt.id }}
      className={`grid ${COLS} items-baseline px-1 py-3 transition-colors hover:bg-accent/40`}
    >
      <span className="truncate text-sm font-medium">{debt.name}</span>
      <span className="num text-sm">{formatMoney(debt.principal)}</span>
      <span className="num hidden text-sm text-muted-foreground sm:block">
        {formatMoney(debt.monthlyPayment)}
      </span>
      <span className="num hidden text-xs text-muted-foreground sm:block">
        {formatIsoDate(debt.payoffDate)}
      </span>
      {/* Bajo sm la fila se parte en dos renglones: nombre y saldo arriba, que es lo que
          se viene a mirar, y cuota y fecha debajo como pie. */}
      <span className="col-span-2 text-xs text-muted-foreground sm:hidden">
        <span className="num">{formatMoney(debt.monthlyPayment)}</span>
        {' · '}
        <span className="num">{formatIsoDate(debt.payoffDate)}</span>
      </span>
    </Link>
  </li>
)

export const DebtList = ({ direction, emptyAction }: Props) => {
  const { data, isPending, isError, refetch } = useDebts(direction)
  const empty = direction === 'LENT' ? copy.empty.lent : copy.empty.borrowed
  const labels = direction === 'LENT' ? copy.list.lentColumns : copy.list.columns

  if (isPending) {
    return (
      <div className="space-y-2 py-3" aria-label={copy.list.loading} aria-busy="true">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  if (isError) return <ErrorState onRetry={() => void refetch()} />

  if (!data || data.data.length === 0) {
    return <EmptyState title={empty.title} description={empty.description} action={emptyAction} />
  }

  return (
    <div>
      <div
        className={`hidden ${COLS} border-b border-border px-1 pb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase sm:grid`}
      >
        <span>{labels.name}</span>
        <span className="text-right">{copy.list.columns.balance}</span>
        <span className="text-right">{copy.list.columns.payment}</span>
        <span className="text-right">{copy.list.columns.payoffDate}</span>
      </div>
      <ul className="divide-y divide-border">
        {data.data.map((debt) => (
          <Row key={debt.id} debt={debt} />
        ))}
      </ul>
      {/* Truncar en silencio sería mentir sobre cuántas deudas hay. */}
      {data.pagination.totalItems > data.data.length ? (
        <p className="mt-3 text-xs text-muted-foreground">
          {copy.list.truncated(data.data.length, data.pagination.totalItems)}
        </p>
      ) : null}
    </div>
  )
}
