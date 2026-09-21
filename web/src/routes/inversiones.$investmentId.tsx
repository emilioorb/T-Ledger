import { useState, type FormEvent } from 'react'
import { useQueries } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { ErrorState } from '@/components/error-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Amount } from '@/features/accounting/amount'
import { copy } from '@/features/investments/copy'
import { GrowthChart, type GrowthPoint } from '@/features/investments/growth-chart'
import type { Investment } from '@/features/investments/types'
import { useAddCapital, useInvestmentProjection } from '@/features/investments/use-investments'
import { apiFetch } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import { formatIsoDate, today } from '@/lib/dates'
import { parseMoneyInput, type CurrencyCode } from '@/lib/money'
import { cn } from '@/lib/utils'

const POINTS = 12

// Un punto por mes desde hoy: la curva sale de preguntarle al servidor el valor a cada fecha,
// no de recalcular la capitalización en el navegador. Dos implementaciones del mismo interés
// compuesto terminarían discrepando en los céntimos.
const monthsAhead = (count: number): string[] =>
  Array.from({ length: count }, (_, index) => {
    const now = new Date()
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + index, 1))
    return date.toISOString().slice(0, 10)
  })

const InvestmentDetailScreen = () => {
  const { investmentId } = Route.useParams()
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(today())
  const investment = useInvestmentProjection(investmentId, today())
  const addCapital = useAddCapital()
  const dates = monthsAhead(POINTS)

  const curve = useQueries({
    queries: dates.map((at) => ({
      queryKey: queryKeys.investments.projection(investmentId, at),
      queryFn: () => apiFetch<Investment>(`/investments/${investmentId}/projection?at=${at}`),
    })),
  })

  if (investment.isPending) {
    return (
      <div className="space-y-3" role="status" aria-label={copy.common.loading}>
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    )
  }

  if (investment.isError) {
    return (
      <ErrorState
        title={copy.common.error.title}
        description={copy.common.error.description}
        retryLabel={copy.common.retry}
        onRetry={() => void investment.refetch()}
      />
    )
  }

  const data = investment.data

  const submit = (event: FormEvent) => {
    event.preventDefault()
    addCapital.mutate(
      {
        id: investmentId,
        input: { date, amount: parseMoneyInput(amount, data.value.currency as CurrencyCode) },
      },
      { onSuccess: () => setAmount('') },
    )
  }
  const points: GrowthPoint[] = curve
    .map((query, index) => {
      if (!query.data) return null
      return {
        month: (dates[index] ?? '').slice(0, 7),
        value: Number(query.data.value.minorUnits) / 100,
        invested: Number(query.data.invested.minorUnits) / 100,
      }
    })
    .filter((point): point is GrowthPoint => point !== null)

  return (
    <section className="space-y-7">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-[60ch]">
          <h1 className="text-xl font-semibold tracking-tight">{data.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.kind === 'FIXED_TERM' && data.maturesAt
              ? `${copy.investments.kinds.FIXED_TERM} · ${copy.investments.columns.matures} ${formatIsoDate(data.maturesAt)}`
              : copy.investments.openHint}
          </p>
        </div>
        {data.matured ? (
          <span className="text-sm text-positive">{copy.investments.matured}</span>
        ) : null}
      </header>

      {/* El desglose es la respuesta: cuánto pusiste y cuánto de lo que ves es rendimiento. */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-y border-border-strong py-4">
        <div>
          <p className="text-xs text-muted-foreground">{copy.investments.columns.value}</p>
          <Amount money={data.value} emphasis="strong" className="mt-1 block text-left text-3xl tracking-tight" />
          <p className={cn('mt-1 text-xs', data.matured ? 'text-positive' : 'text-muted-foreground')}>
            {data.matured
              ? copy.investments.maturedHint
              : data.kind === 'FIXED_TERM'
                ? copy.investments.detail.fixedTermHint
                : copy.investments.openHint}
          </p>
        </div>

        <dl className="flex gap-6 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">{copy.investments.columns.invested}</dt>
            <dd>
              <Amount money={data.invested} />
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{copy.investments.columns.interest}</dt>
            <dd>
              <Amount money={data.interestEarned} emphasis="strong" />
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{copy.investments.columns.rate}</dt>
            <dd className="num">{data.annualRate}%</dd>
          </div>
        </dl>
      </div>

      {points.length > 1 ? (
        <div>
          <h2 className="text-sm font-medium tracking-tight">{copy.investments.detail.curve}</h2>
          <p className="mt-1 max-w-[60ch] text-xs text-muted-foreground">
            {copy.investments.detail.curveHint}
          </p>
          <GrowthChart points={points} />
        </div>
      ) : null}

      {!data.matured ? (
        <form onSubmit={submit} className="space-y-1.5">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="capital-date">{copy.investments.contributionForm.date.label}</Label>
              <Input
                id="capital-date"
                type="date"
                value={date}
                required
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="capital-amount">{copy.investments.contributionForm.amount.label}</Label>
              <Input
                id="capital-amount"
                value={amount}
                inputMode="decimal"
                required
                className="num num-right w-40"
                onChange={(event) => setAmount(event.target.value)}
              />
            </div>
            <Button type="submit" size="sm" disabled={addCapital.isPending}>
              {copy.investments.contributionForm.submit}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {copy.investments.contributionForm.date.hint}
          </p>
        </form>
      ) : null}

      {data.contributions.length > 0 ? (
        <div>
          <h2 className="text-sm font-medium tracking-tight">
            {copy.investments.detail.history}
          </h2>
          <ul className="mt-2">
            {[...data.contributions]
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
        </div>
      ) : null}
    </section>
  )
}

export const Route = createFileRoute('/inversiones/$investmentId')({
  component: InvestmentDetailScreen,
})
