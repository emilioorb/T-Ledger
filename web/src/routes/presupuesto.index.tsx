import { useState, type FormEvent } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Amount } from '@/features/accounting/amount'
import { ControlBar, CurrencyField, DateField } from '@/features/accounting/report-controls'
import { BucketChart } from '@/features/budget/bucket-chart'
import { copy } from '@/features/budget/copy'
import type { BucketEvaluation, CurrencyCode } from '@/features/budget/types'
import {
  useBudgetEvaluation,
  useMonthlyIncome,
  useSetMonthlyIncome,
} from '@/features/budget/use-budget'
import { ApiError } from '@/lib/api'
import { monthEnd, monthStart, today } from '@/lib/dates'
import { parseMoneyInput } from '@/lib/money'
import { cn } from '@/lib/utils'

const monthOf = (iso: string): string => iso.slice(0, 7)

interface RowProps {
  bucket: BucketEvaluation
  month: string
}

// La cubeta que se pasó tiene peso propio; la que está en línea no merece ninguno. Eso
// es jerarquía, no tres barras del mismo color.
const BucketRow = ({ bucket, month }: RowProps) => {
  const isOver = bucket.status === 'OVER'
  const deviation = bucket.deviation.minorUnits.replace('-', '')

  return (
    <li className="border-b border-border py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className={cn('text-sm', isOver && 'font-medium')}>{bucket.name}</span>
        <span className="flex items-baseline gap-4">
          <Amount money={bucket.consumed} emphasis={isOver ? 'strong' : 'normal'} className="text-sm" />
          <span className="text-xs text-muted-foreground">/</span>
          <Amount money={bucket.allocated} className="w-28 text-sm text-muted-foreground" />
        </span>
      </div>

      <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs">
        <span className={cn(isOver ? 'text-warning' : 'text-muted-foreground')}>
          {isOver
            ? copy.budget.overBy(`${deviation.slice(0, -2) || '0'}`)
            : copy.budget.status[bucket.status]}
        </span>
        <Link
          to="/contabilidad/movimientos"
          search={{ from: `${month}-01`, to: monthEnd(`${month}-01`) }}
          className="text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          {copy.budget.viewMovements(bucket.name)}
        </Link>
      </div>
    </li>
  )
}

const BudgetScreen = () => {
  const [currency, setCurrency] = useState<CurrencyCode>('CRC')
  const [at, setAt] = useState(monthStart(today()))
  const [incomeDraft, setIncomeDraft] = useState('')
  const [editingIncome, setEditingIncome] = useState(false)

  const month = monthOf(at)
  const evaluation = useBudgetEvaluation(month, currency)
  const income = useMonthlyIncome(month)
  const setIncome = useSetMonthlyIncome()

  const noModel =
    evaluation.error instanceof ApiError && evaluation.error.code === 'SEMANTIC_VALIDATION_ERROR'

  const submitIncome = (event: FormEvent) => {
    event.preventDefault()
    setIncome.mutate(
      { month, amount: parseMoneyInput(incomeDraft, currency) },
      { onSuccess: () => setEditingIncome(false) },
    )
  }

  const incomeForm = (
    <form onSubmit={submitIncome} className="flex flex-wrap items-end gap-2">
      <div className="space-y-1.5">
        <Label htmlFor="income">{copy.budget.income}</Label>
        <Input
          id="income"
          value={incomeDraft}
          inputMode="decimal"
          required
          className="num w-40"
          onChange={(event) => setIncomeDraft(event.target.value)}
        />
      </div>
      <Button type="submit" size="sm" disabled={setIncome.isPending}>
        {copy.budget.saveIncome}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setEditingIncome(false)}>
        {copy.common.cancel}
      </Button>
    </form>
  )

  return (
    <section className="space-y-6">
      <header className="max-w-[60ch]">
        <h1 className="text-xl font-semibold tracking-tight">{copy.budget.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{copy.budget.description}</p>
      </header>

      <ControlBar>
        <CurrencyField value={currency} onChange={setCurrency} />
        <DateField id="month" label={copy.budget.month} value={at} onChange={setAt} />
      </ControlBar>

      {evaluation.isPending ? (
        <div className="space-y-3" role="status" aria-label={copy.common.loading}>
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : noModel ? (
        <EmptyState
          title={copy.budget.noModel.title}
          description={copy.budget.noModel.description}
          action={
            <Button size="sm" asChild>
              <Link to="/presupuesto/modelos">{copy.budget.noModel.action}</Link>
            </Button>
          }
        />
      ) : evaluation.isError ? (
        <ErrorState
          title={copy.common.error.title}
          description={copy.common.error.description}
          retryLabel={copy.common.retry}
          onRetry={() => void evaluation.refetch()}
        />
      ) : (
        <div className="space-y-7">
          {/* Lo que se mira primero: cuánto queda sin asignar del ingreso del mes. */}
          <div className="flex flex-wrap items-end justify-between gap-4 border-y border-border-strong py-4">
            <div>
              <p className="text-xs text-muted-foreground">{copy.budget.surplus}</p>
              <Amount
                money={evaluation.data.surplus}
                emphasis="strong"
                tone={evaluation.data.surplus.minorUnits.startsWith('-') ? 'alert' : 'plain'}
                className="mt-1 block text-left text-3xl tracking-tight"
              />
              <p className="mt-1 max-w-[52ch] text-xs text-muted-foreground">
                {copy.budget.surplusHint}
              </p>
            </div>

            <dl className="flex gap-6 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">{copy.budget.income}</dt>
                <dd>
                  <Amount money={evaluation.data.income} />
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{copy.budget.consumed}</dt>
                <dd>
                  <Amount money={evaluation.data.totalConsumed} />
                </dd>
              </div>
            </dl>
          </div>

          {!evaluation.data.incomeDeclared && !editingIncome ? (
            <EmptyState
              title={copy.budget.noIncome.title}
              description={copy.budget.noIncome.description}
              action={
                <Button size="sm" onClick={() => setEditingIncome(true)}>
                  {copy.budget.noIncome.action}
                </Button>
              }
            />
          ) : null}

          {editingIncome ? <div className="border-y border-border py-4">{incomeForm}</div> : null}

          {evaluation.data.incomeDeclared && !editingIncome ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => {
                setIncomeDraft(income.data ? income.data.amount.minorUnits.slice(0, -2) : '')
                setEditingIncome(true)
              }}
            >
              {copy.budget.editIncome}
            </Button>
          ) : null}

          <BucketChart buckets={evaluation.data.buckets} />

          <ul>
            {evaluation.data.buckets.map((bucket) => (
              <BucketRow key={bucket.bucketId} bucket={bucket} month={month} />
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

export const Route = createFileRoute('/presupuesto/')({ component: BudgetScreen })
