import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { copy } from '@/features/debts/copy'
import { EmptyState } from '@/features/debts/empty-state'
import { ErrorState } from '@/features/debts/error-state'
import type { PayoffStrategy } from '@/features/debts/types'
import { usePayoffPlan } from '@/features/debts/use-debts'
import { formatMoney } from '@/lib/money'

const explanations: Record<PayoffStrategy, string> = {
  avalanche: copy.payoffPlan.avalanche.explanation,
  snowball: copy.payoffPlan.snowball.explanation,
  manual: '',
}

const PayoffPlanScreen = () => {
  const [strategy, setStrategy] = useState<PayoffStrategy>('avalanche')
  const plan = usePayoffPlan(strategy)

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

      {plan.isPending ? (
        <div className="space-y-2" aria-busy="true">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      ) : plan.isError ? (
        <ErrorState onRetry={() => void plan.refetch()} />
      ) : !plan.data || plan.data.order.length === 0 ? (
        <EmptyState
          title={copy.empty.payoffPlan.title}
          description={copy.empty.payoffPlan.description}
        />
      ) : (
        <div>
          <div className="hidden grid-cols-[4rem_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-4 border-b border-border pb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase sm:grid">
            <span>{copy.payoffPlan.columns.position}</span>
            <span>{copy.payoffPlan.columns.name}</span>
            <span className="text-right">{copy.payoffPlan.columns.annualRate}</span>
            <span className="text-right">{copy.payoffPlan.columns.balance}</span>
            <span className="text-right">{copy.payoffPlan.columns.payment}</span>
          </div>
          <ol className="divide-y divide-border">
            {plan.data.order.map((debt, index) => (
              <li
                key={debt.id}
                className="grid grid-cols-[1.75rem_1fr_auto] items-baseline gap-x-4 gap-y-1 py-3 sm:grid-cols-[4rem_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]"
              >
                <span className="num text-left text-sm text-muted-foreground">{index + 1}</span>
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
