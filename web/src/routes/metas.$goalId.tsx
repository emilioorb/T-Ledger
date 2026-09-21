import { useState, type FormEvent } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { ErrorState } from '@/components/error-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Hint } from '@/components/hint'
import { Amount } from '@/features/accounting/amount'
import { copy } from '@/features/goals/copy'
import { useContribute, useGoal } from '@/features/goals/use-goals'
import { formatIsoDate, today } from '@/lib/dates'
import { parseMoneyInput, type CurrencyCode } from '@/lib/money'
import { cn } from '@/lib/utils'

// Cuántos meses tarde llega, para nombrar el desvío en vez de solo pintarlo.
const monthsBetween = (from: string, to: string | null): number => {
  if (to === null) return 0
  const [fromYear = 0, fromMonth = 0] = from.split('-').map(Number)
  const [toYear = 0, toMonth = 0] = to.split('-').map(Number)
  return Math.max((toYear - fromYear) * 12 + (toMonth - fromMonth), 0)
}

const GoalDetailScreen = () => {
  const { goalId } = Route.useParams()
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(today())

  const goal = useGoal(goalId)
  const contribute = useContribute()

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!goal.data) return
    contribute.mutate(
      {
        id: goalId,
        input: {
          date,
          amount: parseMoneyInput(amount, goal.data.target.currency as CurrencyCode),
        },
      },
      { onSuccess: () => setAmount('') },
    )
  }

  if (goal.isPending) {
    return (
      <div className="space-y-3" role="status" aria-label={copy.common.loading}>
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (goal.isError) {
    return (
      <ErrorState
        title={copy.common.error.title}
        description={copy.common.error.description}
        retryLabel={copy.common.retry}
        onRetry={() => void goal.refetch()}
      />
    )
  }

  const meta = goal.data
  const lateMonths = monthsBetween(meta.desiredDate, meta.projectedDate)

  return (
    <section className="space-y-7">
      <header className="max-w-[60ch]">
        <h1 className="text-xl font-semibold tracking-tight">{meta.name}</h1>
        {meta.reached ? (
          <p className="mt-1 text-sm text-positive">{copy.goals.reachedNote}</p>
        ) : (
          <p className="mt-1 flex flex-wrap items-baseline gap-1.5 text-sm text-muted-foreground">
            {copy.goals.detail.missing}
            <Amount money={meta.remaining} className="text-foreground" />
            {copy.goals.detail.missingSuffix}
          </p>
        )}
      </header>

      {/* La pregunta de una meta no es cuánto llevás sino si llegás: la fecha proyectada
          contra la deseada va arriba y con peso. */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-y border-border-strong py-4">
        <div>
          <p className="text-xs text-muted-foreground">
            {meta.reached
              ? copy.goals.reached
              : meta.projectedDate === null
                ? copy.goals.noPace
                : meta.onTrack
                  ? copy.goals.onTrack
                  : copy.goals.late}
          </p>
          <p
            className={cn(
              'num num-right mt-1 block text-left text-3xl tracking-tight',
              meta.reached
                ? 'text-positive'
                : !meta.onTrack && meta.projectedDate
                  ? 'text-warning'
                  : '',
            )}
          >
            {meta.projectedDate ? formatIsoDate(meta.projectedDate) : '—'}
          </p>
          <p className="mt-1 max-w-[52ch] text-xs text-muted-foreground">
            {meta.projectedDate === null
              ? copy.goals.noPaceHint
              : `${copy.goals.columns.desired} ${formatIsoDate(meta.desiredDate)}`}
          </p>
          {lateMonths > 0 ? (
            <p className="mt-0.5 max-w-[52ch] text-xs text-warning">
              {copy.goals.lateBy(lateMonths)}
            </p>
          ) : null}
        </div>

        <dl className="flex flex-wrap gap-6 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">{copy.goals.columns.contributed}</dt>
            <dd>
              <Amount money={meta.contributed} />
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{copy.goals.columns.target}</dt>
            <dd>
              <Amount money={meta.target} />
            </dd>
          </div>
          {!meta.reached ? (
            <div>
              <dt className="text-xs text-muted-foreground">
                <Hint text={copy.goals.requiredHint}>
                  <span>{copy.goals.columns.required}</span>
                </Hint>
              </dt>
              <dd>
                <Amount money={meta.requiredMonthlyContribution} emphasis="strong" />
              </dd>
            </div>
          ) : null}
          {meta.observedMonthlyPace ? (
            <div>
              <dt className="text-xs text-muted-foreground">
                <Hint text={copy.goals.paceHint}>
                  <span>{copy.goals.columns.pace}</span>
                </Hint>
              </dt>
              <dd>
                <Amount money={meta.observedMonthlyPace} />
              </dd>
            </div>
          ) : null}
        </dl>
      </div>

      {!meta.reached ? (
        <form onSubmit={submit} className="space-y-1.5">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="contribution-date">{copy.goals.contributionForm.date.label}</Label>
              <Input
                id="contribution-date"
                type="date"
                value={date}
                required
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contribution-amount">
                {copy.goals.contributionForm.amount.label}
              </Label>
              <Input
                id="contribution-amount"
                value={amount}
                inputMode="decimal"
                required
                className="num num-right w-40"
                onChange={(event) => setAmount(event.target.value)}
              />
            </div>
            <Button type="submit" size="sm" disabled={contribute.isPending}>
              {copy.goals.contributionForm.submit}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{copy.goals.contributionForm.amount.hint}</p>
        </form>
      ) : null}

      <div>
        <h2 className="text-sm font-medium tracking-tight">{copy.goals.history.title}</h2>

        {meta.contributions.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{copy.goals.history.empty}</p>
        ) : (
          <ul className="mt-2">
            {[...meta.contributions]
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((contribution) => (
                <li
                  key={contribution.id}
                  className="flex items-baseline justify-between gap-3 border-b border-border py-2 text-sm"
                >
                  <span className="num text-xs text-muted-foreground">
                    {formatIsoDate(contribution.date)}
                  </span>
                  <Amount money={contribution.amount} />
                </li>
              ))}
          </ul>
        )}
      </div>
    </section>
  )
}

export const Route = createFileRoute('/metas/$goalId')({
  component: GoalDetailScreen,
})
