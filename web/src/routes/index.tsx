import { Link, createFileRoute } from '@tanstack/react-router'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Amount, isNegativeMoney } from '@/features/accounting/amount'
import { useBudgetEvaluation } from '@/features/budget/use-budget'
import { useGoals } from '@/features/goals/use-goals'
import { copy } from '@/features/projection/overview-copy'
import { useCashFlowProjection } from '@/features/projection/use-projection'
import { formatIsoDate, formatIsoMonth, today } from '@/lib/dates'

const HORIZON = 12

const monthOf = (iso: string): string => iso.slice(0, 7)

const monthLabel = (year: number, month: number): string =>
  formatIsoMonth(`${year}-${String(month).padStart(2, '0')}`)

// No es una fila de cuatro tarjetas de métricas: es una lista de frases, cada una con su
// cifra al lado y su camino para actuar. La jerarquía la da el orden, no una cuadrícula.
interface LineProps {
  text: string
  to: string
  action: string
  amount?: React.ReactNode
  emphasis?: boolean
}

const Line = ({ text, to, action, amount, emphasis }: LineProps) => (
  <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border py-3">
    <span className={emphasis ? 'text-sm font-medium tracking-tight' : 'text-sm'}>{text}</span>
    <span className="flex items-baseline gap-4">
      {amount}
      <Link
        to={to}
        className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
      >
        {action}
      </Link>
    </span>
  </li>
)

const OverviewScreen = () => {
  const month = monthOf(today())
  const evaluation = useBudgetEvaluation(month, 'CRC')
  const projection = useCashFlowProjection(HORIZON, 'CRC')
  const goals = useGoals()

  const loading = evaluation.isPending || projection.isPending || goals.isPending
  // Una consulta caída no puede volverse «no pasa nada»: sin el dato, la frase tranquilizadora
  // sería una afirmación falsa sobre la plata del usuario.
  const failed = evaluation.isError || projection.isError || goals.isError
  const flows = projection.data ?? []
  const current = flows[0]
  const overBucket = evaluation.data?.buckets.find((bucket) => bucket.status === 'OVER')
  const nextFreed = flows.find((flow) => flow.freed.length > 0)
  const nearestGoal = [...(goals.data ?? [])]
    .filter((goal) => !goal.reached && goal.projectedDate !== null)
    .sort((a, b) => (a.projectedDate ?? '').localeCompare(b.projectedDate ?? ''))[0]
  const maturing = flows.find((flow) => !flow.maturingInvestments.minorUnits.startsWith('0'))

  const nothingYet =
    !loading && !failed && flows.length > 0 && current !== undefined &&
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
        <div className="space-y-2" role="status" aria-label="Cargando">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
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
        <ul>
          {current ? (
            <Line
              emphasis
              text={
                isNegativeMoney(current.surplus)
                  ? copy.overview.surplusNegative
                  : copy.overview.surplus
              }
              amount={
                <Amount
                  money={current.surplus}
                  emphasis="strong"
                  tone={isNegativeMoney(current.surplus) ? 'alert' : 'plain'}
                  className="text-xl"
                />
              }
              to="/proyeccion"
              action={copy.overview.goTo.projection}
            />
          ) : null}

          <Line
            text={
              overBucket
                ? copy.overview.overBucket(overBucket.name)
                : copy.overview.overBucketNone
            }
            amount={overBucket ? <Amount money={overBucket.consumed} className="text-sm" /> : undefined}
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
        </ul>
      )}
    </section>
  )
}

export const Route = createFileRoute('/')({ component: OverviewScreen })
