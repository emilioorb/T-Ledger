import type { ReactNode } from 'react'
import {
  Banknote,
  BellRing,
  ChartColumn,
  ChartLine,
  ChartPie,
  Coins,
  CreditCard,
  Landmark,
  PiggyBank,
  Receipt,
  Target,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { EmptyState } from '@/components/empty-state'
import { ProgressBar } from '@/components/progress-bar'
import { ErrorState } from '@/components/error-state'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Amount, isNegativeMoney } from '@/features/accounting/amount'
import { StatCard, StatGrid } from '@/features/accounting/stat-card'
import { ExpenseBreakdown, type ExpenseSlice } from '@/features/accounting/expense-breakdown'
import { IncomeVsSpendingChart } from '@/features/accounting/income-vs-spending-chart'
import { useMonthlyResults } from '@/features/accounting/use-monthly-results'
import {
  useAccountsTree,
  useCategories,
  useMovements,
  useNetWorth,
  usePeriods,
} from '@/features/accounting/use-accounting'
import type { ReportNode } from '@/features/accounting/types'
import { copy as budgetCopy } from '@/features/budget/copy'
import { useBudgetEvaluation } from '@/features/budget/use-budget'
import { useDebts } from '@/features/debts/use-debts'
import { copy as goalsCopy } from '@/features/goals/copy'
import { useGoals } from '@/features/goals/use-goals'
import { useInvestments } from '@/features/investments/use-investments'
import { copy } from '@/features/projection/overview-copy'
import { SurplusChart } from '@/features/projection/surplus-chart'
import { useCashFlowProjection } from '@/features/projection/use-projection'
import type { Money } from '@/features/projection/types'
import { formatIsoDate, formatIsoMonth, monthEnd, monthStart, today } from '@/lib/dates'
import { formatMoney } from '@/lib/money'
import { cn } from '@/lib/utils'
import { TEXT_LINK } from '@/components/text-link'

const HORIZON = 12
const TOP_GOALS = 3
const TREND_MONTHS = 6
const RECENT_MOVEMENTS = 5
const TOP_ACCOUNTS = 6

// Solo las cuentas donde la plata está quieta: las hojas del efectivo. Los totales de los
// grupos repetirían la misma plata una vez por nivel.
const leavesWithBalance = (nodes: ReportNode[]): ReportNode[] =>
  nodes.flatMap((node) =>
    node.children.length > 0
      ? leavesWithBalance(node.children)
      : node.balance.minorUnits === '0'
        ? []
        : [node],
  )

const monthOf = (iso: string): string => iso.slice(0, 7)

const monthLabel = (year: number, month: number): string =>
  formatIsoMonth(`${year}-${String(month).padStart(2, '0')}`)

// Sumar es del cliente porque la API entrega las listas, no sus totales: pedir un endpoint
// nuevo para una suma de diez filas sería mover el problema, no resolverlo.
const sum = (amounts: Money[], currency: Money['currency']): Money => ({
  minorUnits: amounts
    .filter((amount) => amount.currency === currency)
    .reduce((total, amount) => total + BigInt(amount.minorUnits), 0n)
    .toString(),
  currency,
})

const ratio = (part: Money, whole: Money): number => {
  const total = Number(whole.minorUnits)
  if (total <= 0) return 0
  return Math.min(Math.max(Number(part.minorUnits) / total, 0), 1)
}

const Panel = ({
  title,
  hint,
  to,
  action,
  icon: Icon,
  children,
  className,
}: {
  title: string
  hint?: string
  to?: string
  action?: string
  icon: LucideIcon
  children: ReactNode
  className?: string
}) => (
  <Card size="sm" className={cn('gap-0 px-4', className)}>
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="flex items-center gap-2 text-base font-medium tracking-tight">
        <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        {title}
      </h2>
      {to && action ? (
        <Link to={to} className={cn('shrink-0 text-xs', TEXT_LINK)}>
          {action}
        </Link>
      ) : null}
    </div>
    {hint ? <p className="mt-0.5 max-w-[65ch] text-xs text-muted-foreground">{hint}</p> : null}
    {/* flex-1: en una fila las tarjetas miden lo que la más alta, y sin esto el sobrante
        queda colgando al final en vez de repartirse dentro. */}
    <div className="mt-4 flex flex-1 flex-col">{children}</div>
  </Card>
)

// Lo que cambia si no hacés nada. Cada línea nombra el hecho y lleva a donde se resuelve.
const Line = ({
  text,
  to,
  action,
  amount,
}: {
  text: string
  to: string
  action: string
  amount?: ReactNode
}) => (
  <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5">
    <span className="text-sm">{text}</span>
    <span className="flex items-baseline gap-4">
      {amount}
      <Link to={to} className={cn('text-xs', TEXT_LINK)}>
        {action}
      </Link>
    </span>
  </li>
)

const DashboardScreen = () => {
  const month = monthOf(today())
  const evaluation = useBudgetEvaluation(month, 'CRC')
  const projection = useCashFlowProjection(HORIZON, 'CRC')
  const goals = useGoals()
  const netWorth = useNetWorth(today())
  const debts = useDebts('BORROWED')
  const investments = useInvestments()
  // El gasto del mes por categoría sale de los movimientos, no del estado de resultados: el
  // reporte agrupa por cuenta contable, y «en qué se fue» se piensa por categoría.
  const movements = useMovements(
    { from: monthStart(today()), to: monthEnd(today()), kind: 'EXPENSE' },
    1,
    100,
  )
  const categories = useCategories()
  const recent = useMovements({}, 1, RECENT_MOVEMENTS)
  const tree = useAccountsTree('CRC', today())
  const trend = useMonthlyResults(TREND_MONTHS, 'CRC', today())
  const periods = usePeriods()

  const loading = evaluation.isPending || projection.isPending || goals.isPending
  // Una consulta caída no puede volverse «no pasa nada»: sin el dato, la frase tranquilizadora
  // sería una afirmación falsa sobre la plata del usuario.
  const failed = evaluation.isError || projection.isError || goals.isError
  const flows = projection.data ?? []
  const current = flows[0]
  const overBucket = evaluation.data?.buckets.find((bucket) => bucket.status === 'OVER')
  const nextFreed = flows.find((flow) => flow.freed.length > 0)
  const maturing = flows.find((flow) => !flow.maturingInvestments.minorUnits.startsWith('0'))

  const pending = [...(goals.data ?? [])].filter((goal) => !goal.reached)
  const nearestGoal = pending
    .filter((goal) => goal.projectedDate !== null)
    .sort((a, b) => (a.projectedDate ?? '').localeCompare(b.projectedDate ?? ''))[0]
  const topGoals = [...pending]
    .sort((a, b) => a.desiredDate.localeCompare(b.desiredDate))
    .slice(0, TOP_GOALS)

  const debtTotal = sum(
    (debts.data?.data ?? []).map((debt) => debt.principal),
    'CRC',
  )
  const investedTotal = sum(
    (investments.data ?? []).map((investment) => investment.value),
    'CRC',
  )

  // Un movimiento anulado no se gastó: contarlo inflaría el mes con plata que volvió.
  const spent = (movements.data?.data ?? []).filter(
    (movement) => movement.status !== 'VOIDED' && movement.amount.currency === 'CRC',
  )
  const categoryName = new Map(
    (categories.data ?? []).map((category) => [category.id, category.name]),
  )
  const byCategory = new Map<string, bigint>()
  for (const movement of spent) {
    byCategory.set(
      movement.categoryId,
      (byCategory.get(movement.categoryId) ?? 0n) + BigInt(movement.amount.minorUnits),
    )
  }
  const slices: ExpenseSlice[] = [...byCategory.entries()]
    .map(([id, minorUnits]) => ({
      id,
      name: categoryName.get(id) ?? copy.overview.expenses.uncategorized,
      amount: { minorUnits: minorUnits.toString(), currency: 'CRC' as const },
    }))
    .sort((a, b) => Number(BigInt(b.amount.minorUnits) - BigInt(a.amount.minorUnits)))
  const spentTotal = sum(
    slices.map((slice) => slice.amount),
    'CRC',
  )

  // El efectivo cuelga de 1100 en el plan semilla: lo demás del activo no es plata quieta.
  const cash = leavesWithBalance((tree.data ?? []).filter((node) => node.code.startsWith('1')))
    .filter((node) => node.code.startsWith('11'))
    .sort((a, b) => Math.abs(Number(b.balance.minorUnits)) - Math.abs(Number(a.balance.minorUnits)))
    .slice(0, TOP_ACCOUNTS)

  // Un mes anterior abierto no es un error, pero se olvida: hasta cerrarlo, los reportes del
  // mes siguen pudiendo cambiar.
  const openPast = [...(periods.data?.data ?? [])]
    .filter((period) => period.status === 'OPEN' && period.period < month)
    .sort((a, b) => a.period.localeCompare(b.period))[0]

  // Ahorrar no es «lo que sobró»: es la plata que efectivamente movió a una meta o a una
  // inversión este mes. El excedente puede quedarse en la cuenta y gastarse el mes que viene.
  const inMonth = (date: string): boolean => date.startsWith(month)
  const savedThisMonth = sum(
    [
      ...(goals.data ?? []).flatMap((goal) =>
        goal.contributions.filter((entry) => inMonth(entry.date)).map((entry) => entry.amount),
      ),
      ...(investments.data ?? []).flatMap((investment) =>
        investment.contributions
          .filter((entry) => inMonth(entry.date))
          .map((entry) => entry.amount),
      ),
    ],
    'CRC',
  )

  const freedom = [...(debts.data?.data ?? [])]
    .map((debt) => debt.payoffDate)
    .sort((a, b) => b.localeCompare(a))[0]

  const nothingYet =
    !loading &&
    !failed &&
    flows.length > 0 &&
    current !== undefined &&
    current.income.minorUnits === '0' &&
    current.committed.minorUnits === '0' &&
    (goals.data ?? []).length === 0

  return (
    <section className="space-y-6">
      <header className="max-w-[60ch]">
        <h1 className="text-xl font-semibold tracking-tight">{copy.overview.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{copy.overview.greeting}</p>
      </header>

      {loading ? (
        <div className="space-y-3" role="status" aria-label="Cargando">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : failed ? (
        <ErrorState
          title={copy.overview.error.title}
          description={copy.overview.error.description}
          retryLabel={copy.overview.error.retry}
          onRetry={() => {
            if (evaluation.isError) void evaluation.refetch()
            if (projection.isError) void projection.refetch()
            if (goals.isError) void goals.refetch()
          }}
        />
      ) : nothingYet ? (
        <EmptyState
          title={copy.overview.empty.title}
          description={copy.overview.empty.description}
          action={
            <Button size="sm" asChild>
              <Link to="/contabilidad/movimientos">{copy.overview.empty.action}</Link>
            </Button>
          }
        />
      ) : (
        <>
          {/* Las cuatro cifras que contestan «cómo estoy»: cuánto tengo, cuánto me queda
              este mes, cuánto debo y cuánto está rindiendo. */}
          <StatGrid className="lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            <StatCard
              className="sm:col-span-2"
              icon={Landmark}
              label={copy.overview.stats.netWorth}
              hint={copy.overview.stats.netWorthHint}
            >
              {netWorth.data ? (
                <Amount
                  money={netWorth.data.netWorth}
                  emphasis="strong"
                  tone={isNegativeMoney(netWorth.data.netWorth) ? 'alert' : 'plain'}
                  className="block text-left text-3xl tracking-tight"
                />
              ) : (
                <Skeleton className="h-9 w-40" />
              )}
            </StatCard>

            <StatCard
              icon={Coins}
              label={
                current && isNegativeMoney(current.surplus)
                  ? copy.overview.stats.surplusNegative
                  : copy.overview.stats.surplus
              }
            >
              {current ? (
                <Amount
                  money={current.surplus}
                  emphasis="strong"
                  tone={isNegativeMoney(current.surplus) ? 'alert' : 'plain'}
                  className="block text-left text-2xl"
                />
              ) : null}
            </StatCard>

            <StatCard
              icon={PiggyBank}
              label={copy.overview.stats.saved}
              hint={copy.overview.stats.savedHint}
            >
              <Amount money={savedThisMonth} className="block text-left text-2xl" />
            </StatCard>

            <StatCard
              icon={CreditCard}
              label={copy.overview.stats.debt}
              hint={freedom ? copy.overview.stats.debtFree(formatIsoDate(freedom)) : undefined}
            >
              <Amount money={debtTotal} className="block text-left text-2xl" />
            </StatCard>

            <StatCard icon={TrendingUp} label={copy.overview.stats.invested}>
              <Amount money={investedTotal} className="block text-left text-2xl" />
            </StatCard>
          </StatGrid>

          {/* La pregunta que la app existe para contestar: si al ritmo de hoy los meses
              cierran. Por eso es el gráfico grande y va antes que el detalle. */}
          <Panel
            icon={ChartLine}
            title={copy.overview.chart.projection}
            hint={copy.overview.chart.projectionHint}
            to="/proyeccion"
            action={copy.overview.goTo.projection}
          >
            <SurplusChart flows={flows} />
          </Panel>

          <div className="grid gap-3 lg:grid-cols-[1.6fr_1fr]">
            <Panel
              icon={ChartColumn}
              title={copy.overview.trend.title}
              hint={copy.overview.trend.hint}
              to="/contabilidad/resultados"
              action={copy.overview.goTo.results}
            >
              <IncomeVsSpendingChart
                months={trend}
                currency="CRC"
                label={copy.overview.trend.label}
              />
            </Panel>

            <Panel
              icon={Banknote}
              title={copy.overview.balances.title}
              hint={copy.overview.balances.hint}
              to="/contabilidad/cuentas"
              action={copy.overview.goTo.accounts}
            >
              {cash.length > 0 ? (
                <ul className="divide-y divide-border">
                  {cash.map((account) => (
                    <li
                      key={account.code}
                      className="flex items-baseline justify-between gap-3 py-1.5 text-sm"
                    >
                      <span className="min-w-0 truncate">
                        <span className="num mr-1.5 text-xs text-muted-foreground">
                          {account.code}
                        </span>
                        {account.name}
                      </span>
                      <Amount money={account.balance} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">{copy.overview.balances.empty}</p>
              )}
            </Panel>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <Panel
              icon={ChartPie}
              title={copy.overview.expenses.title}
              hint={copy.overview.expenses.hint}
              to="/contabilidad/movimientos"
              action={copy.overview.goTo.movementsList}
            >
              {slices.length > 0 ? (
                <ExpenseBreakdown
                  slices={slices}
                  total={spentTotal}
                  label={copy.overview.expenses.label}
                  totalLabel={copy.overview.expenses.total}
                  restLabel={copy.overview.expenses.rest}
                />
              ) : (
                <p className="text-sm text-muted-foreground">{copy.overview.expenses.empty}</p>
              )}
            </Panel>

            <Panel
              icon={Wallet}
              title={copy.overview.chart.budget(formatIsoMonth(`${month}-01`))}
              hint={copy.overview.chart.budgetHint}
              to="/presupuesto"
              action={copy.overview.goTo.budget}
            >
              {evaluation.data && evaluation.data.buckets.length > 0 ? (
                <ul className="space-y-3.5">
                  {evaluation.data.buckets.map((bucket) => (
                    <li key={bucket.bucketId}>
                      <div className="flex items-baseline justify-between gap-3 text-xs">
                        <span className="min-w-0 truncate">{bucket.name}</span>
                        <span className="flex shrink-0 items-baseline gap-1.5">
                          <Amount
                            money={bucket.consumed}
                            className={bucket.status === 'OVER' ? 'text-warning' : undefined}
                          />
                          <span className="text-muted-foreground">{copy.overview.goals.of}</span>
                          <span className="text-muted-foreground">
                            <Amount money={bucket.allocated} />
                          </span>
                        </span>
                      </div>
                      <ProgressBar
                        className="mt-1.5"
                        value={ratio(bucket.consumed, bucket.allocated)}
                        tone={bucket.status === 'OVER' ? 'warning' : 'plain'}
                        label={budgetCopy.budget.barLabel(
                          bucket.name,
                          formatMoney(bucket.consumed),
                          formatMoney(bucket.allocated),
                        )}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">{copy.overview.chart.noBudget}</p>
              )}
            </Panel>

            <Panel
              icon={Target}
              title={copy.overview.goals.title}
              hint={copy.overview.goals.hint}
              to="/metas"
              action={copy.overview.goTo.goals}
            >
              {topGoals.length > 0 ? (
                <ul className="space-y-3.5">
                  {topGoals.map((goal) => (
                    <li key={goal.id}>
                      <div className="flex items-baseline justify-between gap-3 text-xs">
                        <span className="min-w-0 truncate">{goal.name}</span>
                        <span
                          className={cn(
                            'num shrink-0',
                            goal.projectedDate === null
                              ? 'text-muted-foreground'
                              : goal.onTrack
                                ? 'text-positive'
                                : 'text-warning',
                          )}
                        >
                          {goal.projectedDate ? formatIsoDate(goal.projectedDate) : '—'}
                        </span>
                      </div>
                      <ProgressBar
                        className="mt-1.5"
                        value={ratio(goal.contributed, goal.target)}
                        tone={goal.onTrack ? 'plain' : 'warning'}
                        label={goalsCopy.goals.progressLabel(
                          formatMoney(goal.contributed),
                          formatMoney(goal.target),
                        )}
                      />
                      <p className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5 text-xs text-muted-foreground">
                        <Amount money={goal.contributed} />
                        <span>{copy.overview.goals.of}</span>
                        <Amount money={goal.target} />
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">{copy.overview.goals.empty}</p>
              )}
            </Panel>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <Panel
              icon={Receipt}
              title={copy.overview.recent.title}
              hint={copy.overview.recent.hint}
              to="/contabilidad/movimientos"
              action={copy.overview.goTo.movementsList}
            >
              {(recent.data?.data ?? []).length > 0 ? (
                <ul className="divide-y divide-border">
                  {(recent.data?.data ?? []).map((movement) => (
                    <li
                      key={movement.id}
                      className="flex items-baseline justify-between gap-3 py-2 text-sm"
                    >
                      <span className="num shrink-0 text-xs text-muted-foreground">
                        {formatIsoDate(movement.date)}
                      </span>
                      <span
                        className={cn(
                          'min-w-0 flex-1 truncate',
                          movement.status === 'VOIDED' && 'text-muted-foreground line-through',
                        )}
                      >
                        {movement.counterparty}
                      </span>
                      <Amount
                        money={movement.amount}
                        className={cn(
                          movement.kind === 'INCOME' && 'text-positive',
                          movement.status === 'VOIDED' && 'text-muted-foreground line-through',
                        )}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">{copy.overview.recent.empty}</p>
              )}
            </Panel>

            <Panel
              icon={BellRing}
              title={copy.overview.attention.title}
              hint={copy.overview.attention.hint}
            >
              <ul className="divide-y divide-border">
                <Line
                  text={
                    overBucket
                      ? copy.overview.overBucket(overBucket.name)
                      : copy.overview.overBucketNone
                  }
                  amount={
                    overBucket ? (
                      <Amount money={overBucket.consumed} className="text-sm" />
                    ) : undefined
                  }
                  to="/presupuesto"
                  action={copy.overview.goTo.budget}
                />

                <Line
                  text={
                    nextFreed?.freed[0]
                      ? copy.overview.nextFreed(
                          nextFreed.freed[0].name,
                          monthLabel(nextFreed.year, nextFreed.month),
                        )
                      : copy.overview.nextFreedNone
                  }
                  amount={
                    nextFreed?.freed[0] ? (
                      <Amount money={nextFreed.freed[0].amount} className="text-sm" />
                    ) : undefined
                  }
                  to="/proyeccion"
                  action={copy.overview.goTo.projection}
                />

                <Line
                  text={
                    nearestGoal
                      ? nearestGoal.onTrack
                        ? copy.overview.nearestGoal(
                            nearestGoal.name,
                            formatIsoDate(nearestGoal.projectedDate ?? ''),
                          )
                        : copy.overview.nearestGoalLate(nearestGoal.name)
                      : copy.overview.nearestGoalNone
                  }
                  amount={
                    nearestGoal ? (
                      <Amount money={nearestGoal.requiredMonthlyContribution} className="text-sm" />
                    ) : undefined
                  }
                  to="/metas"
                  action={copy.overview.goTo.goals}
                />

                {maturing ? (
                  <Line
                    text={copy.overview.maturing(
                      'Una inversión',
                      monthLabel(maturing.year, maturing.month),
                    )}
                    amount={<Amount money={maturing.maturingInvestments} className="text-sm" />}
                    to="/inversiones"
                    action={copy.overview.goTo.projection}
                  />
                ) : null}

                {openPast ? (
                  <Line
                    text={copy.overview.closing.pending(formatIsoMonth(`${openPast.period}-01`))}
                    to="/contabilidad/cierre"
                    action={copy.overview.closing.action}
                  />
                ) : null}
              </ul>
            </Panel>
          </div>
        </>
      )}
    </section>
  )
}

export const Route = createFileRoute('/')({ component: DashboardScreen })
