import { useState, type FormEvent } from 'react'
import { CalendarClock, Coins, Flag, ListOrdered, Target, TrendingUp } from 'lucide-react'
import { createFileRoute } from '@tanstack/react-router'
import { ErrorState } from '@/components/error-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Hint } from '@/components/hint'
import { Amount } from '@/features/accounting/amount'
import { StatCard, StatGrid } from '@/features/accounting/stat-card'
import { copy } from '@/features/goals/copy'
import { useAccounts } from '@/features/accounting/use-accounting'
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
  const [fromAccountCode, setFromAccountCode] = useState('')

  const goal = useGoal(goalId)
  const accounts = useAccounts()
  const contribute = useContribute()

  // De dónde sale la plata: cuentas de activo que aceptan asientos, menos la de la meta,
  // porque el traslado sería de ella a ella misma.
  const all = accounts.data?.data ?? []
  const parents = new Set(all.map((account) => account.parentCode).filter(Boolean))
  const origins = all.filter(
    (account) =>
      account.accountClass === 'ASSET' &&
      account.active &&
      !parents.has(account.code) &&
      account.code !== goal.data?.accountCode,
  )

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!goal.data) return
    contribute.mutate(
      {
        id: goalId,
        input: {
          date,
          amount: parseMoneyInput(amount, goal.data.target.currency as CurrencyCode),
          fromAccountCode,
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
      {/* La pregunta de una meta no es cuánto llevás sino si llegás: la fecha proyectada
          contra la deseada va arriba y con peso. */}
      <StatGrid>
        <StatCard
          icon={Target}
          className="sm:col-span-2"
          label={
            meta.reached
              ? copy.goals.reached
              : meta.projectedDate === null
                ? copy.goals.noPace
                : meta.onTrack
                  ? copy.goals.onTrack
                  : copy.goals.late
          }
          hint={
            <>
              {meta.projectedDate === null
                ? copy.goals.noPaceHint
                : `${copy.goals.columns.desired} ${formatIsoDate(meta.desiredDate)}`}
              {lateMonths > 0 ? (
                <span className="mt-0.5 block text-warning">{copy.goals.lateBy(lateMonths)}</span>
              ) : null}
            </>
          }
        >
          <p
            className={cn(
              'num block text-left text-3xl tracking-tight',
              meta.reached
                ? 'text-positive'
                : !meta.onTrack && meta.projectedDate
                  ? 'text-warning'
                  : '',
            )}
          >
            {meta.projectedDate ? formatIsoDate(meta.projectedDate) : '—'}
          </p>
        </StatCard>

        <StatCard icon={Coins} label={copy.goals.columns.contributed}>
          <Amount money={meta.contributed} className="block text-left text-2xl" />
        </StatCard>
        <StatCard icon={Flag} label={copy.goals.columns.target}>
          <Amount money={meta.target} className="block text-left text-2xl" />
        </StatCard>
        {!meta.reached ? (
          <StatCard
            icon={CalendarClock}
            label={
              <Hint text={copy.goals.requiredHint}>
                <span>{copy.goals.columns.required}</span>
              </Hint>
            }
          >
            <Amount
              money={meta.requiredMonthlyContribution}
              emphasis="strong"
              className="block text-left text-2xl"
            />
          </StatCard>
        ) : null}
        {meta.observedMonthlyPace ? (
          <StatCard
            icon={TrendingUp}
            label={
              <Hint text={copy.goals.paceHint}>
                <span>{copy.goals.columns.pace}</span>
              </Hint>
            }
          >
            <Amount money={meta.observedMonthlyPace} className="block text-left text-2xl" />
          </StatCard>
        ) : null}
      </StatGrid>

      {meta.reached ? null : meta.accountCode === null ? (
        <p className="max-w-[65ch] text-sm text-muted-foreground">
          {copy.goals.contributionForm.needsAccount}
        </p>
      ) : (
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
            <div className="space-y-1.5">
              <Label htmlFor="contribution-from">{copy.goals.contributionForm.from.label}</Label>
              <Select value={fromAccountCode} onValueChange={setFromAccountCode}>
                <SelectTrigger id="contribution-from" className="h-8 w-56">
                  <SelectValue placeholder={copy.goals.contributionForm.from.label} />
                </SelectTrigger>
                <SelectContent>
                  {origins.map((account) => (
                    <SelectItem key={account.code} value={account.code}>
                      {account.code} · {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="submit"
              size="sm"
              disabled={contribute.isPending || fromAccountCode === ''}
            >
              {copy.goals.contributionForm.submit}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{copy.goals.contributionForm.description}</p>
        </form>
      )}

      <div>
        <h2 className="flex items-center gap-2 text-base font-medium tracking-tight">
          <ListOrdered className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          {copy.goals.history.title}
        </h2>

        {meta.contributions.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{copy.goals.history.empty}</p>
        ) : (
          <ul className="mt-2 divide-y divide-border">
            {[...meta.contributions]
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((contribution) => (
                <li
                  key={contribution.id}
                  className="flex items-baseline justify-between gap-3 py-2 text-sm"
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
