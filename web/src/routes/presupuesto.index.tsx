import { useState, type FormEvent } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { EmptyState } from '@/components/empty-state'
import { FormDialog } from '@/components/form-dialog'
import { ErrorState } from '@/components/error-state'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Hint } from '@/components/hint'
import { Amount } from '@/features/accounting/amount'
import { ControlBar, CurrencyField, MonthField } from '@/features/accounting/report-controls'
import { StatCard, StatGrid } from '@/features/accounting/stat-card'
import { copy } from '@/features/budget/copy'
import type { BucketEvaluation, CurrencyCode } from '@/features/budget/types'
import {
  useBudgetEvaluation,
  useMonthlyIncome,
  useSetMonthlyIncome,
} from '@/features/budget/use-budget'
import { ApiError } from '@/lib/api'
import { monthEnd, monthStart, today } from '@/lib/dates'
import { absMoney, formatMoney, parseMoneyInput } from '@/lib/money'
import { cn } from '@/lib/utils'

const monthOf = (iso: string): string => iso.slice(0, 7)

interface RowProps {
  bucket: BucketEvaluation
  month: string
}

// La cubeta que se pasó tiene peso propio; la que está en línea no merece ninguno. La barra
// reemplaza al gráfico: dice lo mismo, en la fila donde están las cifras.
const consumedRatio = (bucket: BucketEvaluation): number => {
  const allocated = Number(bucket.allocated.minorUnits)
  if (allocated <= 0) return 0
  return Math.min(Number(bucket.consumed.minorUnits) / allocated, 1)
}

const BucketRow = ({ bucket, month }: RowProps) => {
  const isOver = bucket.status === 'OVER'
  const deviation = absMoney(bucket.deviation)

  return (
    <Card size="sm" className="gap-3 px-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className={cn('text-sm', isOver && 'font-medium')}>{bucket.name}</h3>
        <span className={cn('text-xs', isOver ? 'text-warning' : 'text-muted-foreground')}>
          {isOver ? copy.budget.overBy(formatMoney(deviation)) : copy.budget.status[bucket.status]}
        </span>
      </div>

      {/* Lo consumido manda y lo asignado es la referencia: el dato es cuánto se fue, no
          cuánto cabía. */}
      <div>
        <Amount
          money={bucket.consumed}
          emphasis={isOver ? 'strong' : 'normal'}
          tone={isOver ? 'alert' : 'plain'}
          className="block text-left text-2xl tracking-tight"
        />
        <p className="mt-0.5 num text-left text-xs text-muted-foreground">
          {copy.budget.allocatedOf(formatMoney(bucket.allocated))}
        </p>
      </div>

      <div
        className="h-1 w-full bg-border-strong"
        role="img"
        aria-label={copy.budget.barLabel(
          bucket.name,
          formatMoney(bucket.consumed),
          formatMoney(bucket.allocated),
        )}
      >
        <div
          className={cn('h-full', isOver ? 'bg-warning' : 'bg-foreground')}
          style={{ width: `${consumedRatio(bucket) * 100}%` }}
        />
      </div>

      <Link
        to="/contabilidad/movimientos"
        search={{ from: `${month}-01`, to: monthEnd(`${month}-01`) }}
        className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
      >
        {copy.budget.viewMovements(bucket.name)}
      </Link>
    </Card>
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

  const overBucket = evaluation.data?.buckets.find((bucket) => bucket.status === 'OVER')

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
    <form onSubmit={submitIncome} className="grid gap-4">
      <div className="space-y-1.5">
        <Label htmlFor="income">{copy.budget.income}</Label>
        <Input
          id="income"
          value={incomeDraft}
          inputMode="decimal"
          required
          className="num num-right w-full"
          onChange={(event) => setIncomeDraft(event.target.value)}
        />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="submit" size="sm" disabled={setIncome.isPending}>
          {copy.budget.saveIncome}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setEditingIncome(false)}>
          {copy.common.cancel}
        </Button>
      </div>
    </form>
  )

  return (
    <section className="space-y-6">
      <header className="max-w-[60ch]">
        <h1 className="text-xl font-semibold tracking-tight">{copy.budget.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{copy.budget.description}</p>
      </header>

      <ControlBar separated={false}>
        <CurrencyField value={currency} onChange={setCurrency} />
        <MonthField id="month" label={copy.budget.month} value={at} onChange={setAt} />
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
          {/* La pregunta del mes no es cuánto queda sin gastar: es si alguna cubeta se pasó.
              Cuando la respuesta es un estado, el héroe es la frase; cuando es un monto, la cifra. */}
          <StatGrid className="lg:grid-cols-3">
            <StatCard
              className="sm:col-span-2 lg:col-span-3"
              label={
                overBucket ? (
                  <span className="text-warning">{copy.budget.overBucket(overBucket.name)}</span>
                ) : (
                  copy.budget.monthState
                )
              }
              hint={overBucket ? copy.budget.overHint : copy.budget.noOverHint}
            >
              {overBucket ? (
                <Amount
                  money={absMoney(overBucket.deviation)}
                  emphasis="strong"
                  tone="alert"
                  className="block text-left text-3xl tracking-tight"
                />
              ) : (
                <p className="text-2xl tracking-tight">{copy.budget.noOverBucket}</p>
              )}
            </StatCard>

            <StatCard label={copy.budget.income}>
              <Amount money={evaluation.data.income} className="block text-left text-lg" />
            </StatCard>
            <StatCard label={copy.budget.consumed}>
              <Amount money={evaluation.data.totalConsumed} className="block text-left text-lg" />
            </StatCard>
            <StatCard
              label={
                <Hint text={copy.budget.surplusHint}>
                  <span>{copy.budget.surplus}</span>
                </Hint>
              }
            >
              <Amount
                money={evaluation.data.surplus}
                tone={evaluation.data.surplus.minorUnits.startsWith('-') ? 'alert' : 'plain'}
                className="block text-left text-lg"
              />
            </StatCard>
          </StatGrid>

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

          <FormDialog
            open={editingIncome}
            title={copy.budget.editIncome}
            description={copy.budget.incomeHint}
            onOpenChange={setEditingIncome}
          >
            {incomeForm}
          </FormDialog>

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

          {/* Una cubeta por tarjeta: son tres cosas que se comparan entre sí, no una lista
              que se recorre. */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {evaluation.data.buckets.map((bucket) => (
              <BucketRow key={bucket.bucketId} bucket={bucket} month={month} />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

export const Route = createFileRoute('/presupuesto/')({ component: BudgetScreen })
