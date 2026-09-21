import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { SearchInput } from '@/components/search-input'
import { FRAME_ROW, FrameHeader, TableFrame } from '@/components/table-frame'
import { SortButton } from '@/components/sort-button'
import { SortSelect } from '@/components/sort-select'
import { Skeleton } from '@/components/ui/skeleton'
import { formatIsoDate } from '@/lib/dates'
import { useTableControls, type SortValue } from '@/lib/use-table-controls'
import { copy } from './copy'
import { DebtRowActions } from './debt-row-actions'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import type { Debt, DebtDirection } from './types'
import { useDebts } from './use-debts'
import { Amount } from '@/features/accounting/amount'

interface Props {
  direction: DebtDirection
  emptyAction?: ReactNode
  onEdit: (debt: Debt) => void
}

// Encabezado y filas comparten la misma plantilla de columnas, con la última de ancho
// fijo: con `auto` cada grilla la resuelve por su cuenta y las cifras dejan de alinear.
// Solo las columnas, sin el display: el encabezado se oculta en la fila angosta y la fila no.
//
// `@2xl` mide el contenedor: tres montos indivisibles más el nombre no entran en los 489 px
// que deja la barra lateral a 768 px de ventana, que es justo donde `sm` los encendía.
const COLS =
  'grid-cols-[1fr_auto_auto] gap-x-4 gap-y-1 @2xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_6.5rem_4.5rem]'

const columns = {
  name: (debt: Debt) => debt.name,
  balance: (debt: Debt) => BigInt(debt.principal.minorUnits),
  payment: (debt: Debt) => BigInt(debt.monthlyPayment.minorUnits),
  payoffDate: (debt: Debt) => debt.payoffDate,
} satisfies Record<string, (debt: Debt) => SortValue>

type ColumnKey = keyof typeof columns

const Row = ({ debt, onEdit }: { debt: Debt; onEdit: () => void }) => (
  <li
    className={`group grid ${COLS} ${FRAME_ROW} items-baseline transition-colors hover:bg-accent/40`}
  >
    <Link
      to="/deudas/$debtId"
      params={{ debtId: debt.id }}
      className="truncate text-sm font-medium hover:underline"
    >
      {debt.name}
    </Link>
    <Amount money={debt.principal} className="text-sm" />
    <Amount
      money={debt.monthlyPayment}
      className="hidden text-sm text-muted-foreground @2xl:block"
    />
    <span className="num num-right hidden text-xs text-muted-foreground @2xl:block">
      {formatIsoDate(debt.payoffDate)}
    </span>
    <DebtRowActions debt={debt} onEdit={onEdit} />
    {/* Bajo sm la fila se parte en dos renglones: nombre y saldo arriba, que es lo que
        se viene a mirar, y cuota y fecha debajo como pie. */}
    <span className="col-span-2 text-xs text-muted-foreground @2xl:hidden">
      <Amount money={debt.monthlyPayment} />
      {' · '}
      <span className="num num-right">{formatIsoDate(debt.payoffDate)}</span>
    </span>
  </li>
)

export const DebtList = ({ direction, emptyAction, onEdit }: Props) => {
  const { data, isPending, isError, refetch } = useDebts(direction)
  const empty = direction === 'LENT' ? copy.empty.lent : copy.empty.borrowed
  const labels = direction === 'LENT' ? copy.list.lentColumns : copy.list.columns

  const table = useTableControls<Debt, ColumnKey>({
    rows: data?.data ?? [],
    columns,
    initial: { key: 'balance', direction: 'desc' },
    searchable: (debt) => `${debt.name} ${debt.counterparty}`,
  })

  if (isPending) {
    return (
      <div className="space-y-2 py-3" role="status" aria-label={copy.list.loading} aria-busy="true">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  if (isError)
    return (
      <ErrorState
        title={copy.error.title}
        description={copy.error.description}
        retryLabel={copy.error.retry}
        onRetry={() => void refetch()}
      />
    )

  if (!data || data.data.length === 0) {
    return <EmptyState title={empty.title} description={empty.description} action={emptyAction} />
  }

  const header = (key: ColumnKey, label: string, align: 'left' | 'right' = 'right') => (
    <SortButton
      label={label}
      align={align}
      active={table.sort.key === key}
      direction={table.sort.direction}
      onClick={() => table.toggle(key)}
    />
  )

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 @lg:flex-row @lg:items-center">
        <SearchInput
          value={table.query}
          onChange={table.setQuery}
          placeholder={copy.list.search.placeholder}
          label={copy.list.search.label}
        />
        <SortSelect
          options={[
            { key: 'name', label: labels.name },
            { key: 'balance', label: copy.list.columns.balance },
            { key: 'payment', label: copy.list.columns.payment },
            { key: 'payoffDate', label: copy.list.columns.payoffDate },
          ]}
          value={table.sort.key}
          direction={table.sort.direction}
          onChange={(key) => table.setSort(key)}
          onFlip={() => table.toggle(table.sort.key)}
          className="@2xl:hidden"
        />
      </div>

      <TableFrame>
        <FrameHeader className={`hidden ${COLS} @2xl:grid`}>
          {header('name', labels.name, 'left')}
          {header('balance', copy.list.columns.balance)}
          {header('payment', copy.list.columns.payment)}
          {header('payoffDate', copy.list.columns.payoffDate)}
          <span className="inline-flex min-h-6 items-center justify-end">{copy.list.actions}</span>
        </FrameHeader>

        {table.rows.length === 0 ? (
          <p className="px-3 py-6 text-sm text-muted-foreground">
            {copy.list.noMatches(table.query)}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {table.rows.map((debt) => (
              <Row key={debt.id} debt={debt} onEdit={() => onEdit(debt)} />
            ))}
          </ul>
        )}
      </TableFrame>

      {/* Truncar en silencio sería mentir sobre cuántas deudas hay. */}
      {data.pagination.totalItems > data.data.length ? (
        <p className="text-xs text-muted-foreground">
          {copy.list.truncated(data.data.length, data.pagination.totalItems)}
        </p>
      ) : null}
    </div>
  )
}
