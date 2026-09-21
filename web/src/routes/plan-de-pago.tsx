import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { SearchInput } from '@/components/search-input'
import { SortButton } from '@/components/sort-button'
import { SortSelect } from '@/components/sort-select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { copy } from '@/features/debts/copy'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import type { PayoffStrategy } from '@/features/debts/types'
import { usePayoffPlan } from '@/features/debts/use-debts'
import { formatMoney } from '@/lib/money'
import { useTableControls, type SortValue } from '@/lib/use-table-controls'

const explanations: Record<PayoffStrategy, string> = {
  avalanche: copy.payoffPlan.avalanche.explanation,
  snowball: copy.payoffPlan.snowball.explanation,
  manual: '',
}

type PlanRow = NonNullable<ReturnType<typeof usePayoffPlan>['data']>['order'][number]

// El orden que devuelve la estrategia es la respuesta de la pantalla: esa es la columna
// por la que arranca ordenada, y volver a ella deshace cualquier otro orden.
const columns = {
  position: (_row: PlanRow, index: number) => index,
  name: (row: PlanRow) => row.name,
  annualRate: (row: PlanRow) => Number(row.annualRate),
  balance: (row: PlanRow) => BigInt(row.balance.minorUnits),
  payment: (row: PlanRow) => BigInt(row.monthlyPayment.minorUnits),
}

type ColumnKey = keyof typeof columns

const PayoffPlanScreen = () => {
  const [strategy, setStrategy] = useState<PayoffStrategy>('avalanche')
  const plan = usePayoffPlan(strategy)

  const ranked = (plan.data?.order ?? []).map((row, index) => ({ ...row, position: index + 1 }))
  const table = useTableControls<PlanRow & { position: number }, ColumnKey>({
    rows: ranked,
    columns: {
      position: (row) => row.position,
      name: columns.name,
      annualRate: columns.annualRate,
      balance: columns.balance,
      payment: columns.payment,
    } as Record<ColumnKey, (row: PlanRow & { position: number }) => SortValue>,
    initial: { key: 'position', direction: 'asc' },
    searchable: (row) => row.name,
  })

  const header = (key: ColumnKey, label: string, align: 'left' | 'right' = 'right') => (
    <SortButton
      label={label}
      align={align}
      className="uppercase"
      active={table.sort.key === key}
      direction={table.sort.direction}
      onClick={() => table.toggle(key)}
    />
  )

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{copy.payoffPlan.title}</h1>
        <p className="mt-0.5 max-w-[65ch] text-sm text-muted-foreground">
          {copy.payoffPlan.description}
        </p>
      </div>

      <div className="space-y-2">
        <Tabs value={strategy} onValueChange={(value) => setStrategy(value as PayoffStrategy)}>
          <TabsList aria-label={copy.payoffPlan.strategy.label}>
            <TabsTrigger value="avalanche">{copy.payoffPlan.avalanche.name}</TabsTrigger>
            <TabsTrigger value="snowball">{copy.payoffPlan.snowball.name}</TabsTrigger>
          </TabsList>
        </Tabs>
        <p className="max-w-[65ch] text-sm text-muted-foreground">{explanations[strategy]}</p>
      </div>

      {plan.data && plan.data.order.length > 0 ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <SearchInput
            value={table.query}
            onChange={table.setQuery}
            placeholder={copy.payoffPlan.search.placeholder}
            label={copy.payoffPlan.search.label}
          />
          <SortSelect
            options={[
              { key: 'position', label: copy.payoffPlan.columns.position },
              { key: 'name', label: copy.payoffPlan.columns.name },
              { key: 'annualRate', label: copy.payoffPlan.columns.annualRate },
              { key: 'balance', label: copy.payoffPlan.columns.balance },
              { key: 'payment', label: copy.payoffPlan.columns.payment },
            ]}
            value={table.sort.key}
            direction={table.sort.direction}
            onChange={(key) => table.setSort(key)}
            onFlip={() => table.toggle(table.sort.key)}
            className="sm:hidden"
          />
        </div>
      ) : null}

      {plan.isPending ? (
        <div className="space-y-2" aria-busy="true">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      ) : plan.isError ? (
        <ErrorState
          title={copy.error.title}
          description={copy.error.description}
          retryLabel={copy.error.retry}
          onRetry={() => void plan.refetch()}
        />
      ) : !plan.data || plan.data.order.length === 0 ? (
        <EmptyState
          title={copy.empty.payoffPlan.title}
          description={copy.empty.payoffPlan.description}
        />
      ) : (
        <div>
          <div className="hidden grid-cols-[4rem_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-4 border-b border-border pb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase sm:grid">
            {header('position', copy.payoffPlan.columns.position, 'left')}
            {header('name', copy.payoffPlan.columns.name, 'left')}
            {header('annualRate', copy.payoffPlan.columns.annualRate)}
            {header('balance', copy.payoffPlan.columns.balance)}
            {header('payment', copy.payoffPlan.columns.payment)}
          </div>
          {table.rows.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">
              {copy.payoffPlan.noMatches(table.query)}
            </p>
          ) : null}
          <ol className="divide-y divide-border">
            {table.rows.map((debt) => (
              <li
                key={debt.id}
                className="grid grid-cols-[1.75rem_1fr_auto] items-baseline gap-x-4 gap-y-1 py-3 sm:grid-cols-[4rem_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]"
              >
                <span className="num text-left text-sm text-muted-foreground">{debt.position}</span>
                <span className="truncate text-sm font-medium">{debt.name}</span>
                <span className="num text-sm">{debt.annualRate} %</span>
                <span className="num hidden text-sm sm:block">{formatMoney(debt.balance)}</span>
                <span className="num hidden text-sm text-muted-foreground sm:block">
                  {formatMoney(debt.monthlyPayment)}
                </span>
                {/* Bajo sm, saldo y cuota bajan a un pie: arriba queda el orden, que es
                    la respuesta que la pantalla vino a dar. */}
                <span className="col-span-2 col-start-2 text-xs text-muted-foreground sm:hidden">
                  <span className="num">{formatMoney(debt.balance)}</span>
                  {' · '}
                  <span className="num">{formatMoney(debt.monthlyPayment)}</span>
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-xs text-muted-foreground">{copy.payoffPlan.lentNote}</p>
        </div>
      )}
    </section>
  )
}

export const Route = createFileRoute('/plan-de-pago')({
  component: PayoffPlanScreen,
})
