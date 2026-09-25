import { useState, type FormEvent } from 'react'
import { Coins, PiggyBank, Receipt, Wallet } from 'lucide-react'
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
import { sinModeloActivo } from '@/features/budget/sin-modelo-activo'
import { monthEnd, monthStart, today } from '@/lib/dates'
import { absMoney, formatMoney, parseMoneyInput } from '@/lib/money'
import { cn } from '@/lib/utils'
import { ProgressBar } from '@/components/progress-bar'
import { TEXT_LINK } from '@/components/text-link'

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
        {/* h2 y no h3: la pantalla no tiene ningún encabezado entre su h1 y esta tarjeta. */}
        <h2 className={cn('text-sm', isOver && 'font-medium')}>{bucket.name}</h2>
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

      <ProgressBar
        value={consumedRatio(bucket)}
        tone={isOver ? 'warning' : 'plain'}
        label={copy.budget.barLabel(
          bucket.name,
          formatMoney(bucket.consumed),
          formatMoney(bucket.allocated),
        )}
      />

      <Link
        to="/contabilidad/movimientos"
        search={{ from: `${month}-01`, to: monthEnd(`${month}-01`) }}
        className={cn('text-xs', TEXT_LINK)}
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
  // La versión que se vio al abrir el formulario (`null`: el mes sin declarar). Una recarga en
  // segundo plano traería la de otra persona, y guardar con esa la pisaría sin 409.
  const [versionVista, setVersionVista] = useState<number | null>(null)

  const month = monthOf(at)
  const evaluation = useBudgetEvaluation(month, currency)
  const income = useMonthlyIncome(month)
  const setIncome = useSetMonthlyIncome()

  const overBucket = evaluation.data?.buckets.find((bucket) => bucket.status === 'OVER')

  const noModel = sinModeloActivo(evaluation.error)

  const submitIncome = (event: FormEvent) => {
    event.preventDefault()
    setIncome.mutate(
      { month, amount: parseMoneyInput(incomeDraft, currency), version: versionVista },
      { onSuccess: () => setEditingIncome(false) },
    )
  }

  // Declarar y editar son el mismo formulario: sin ingreso todavía arranca vacío, y con uno
  // ya declarado precarga el monto y la versión que se vio, para que guardar no lo pise a
  // ciegas. Los tres botones que abren el diálogo —sin modelo, sin ingreso, y para editarlo—
  // usan esta misma función.
  const openIncomeForm = () => {
    setIncomeDraft(income.data ? income.data.amount.minorUnits.slice(0, -2) : '')
    setVersionVista(income.data?.version ?? null)
    setEditingIncome(true)
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

      <ControlBar>
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
            // Sin modelo el ingreso no se puede evaluar contra nada, pero sí declararse: la
            // API lo acepta igual, y no tiene sentido esperar al primer modelo para eso.
            <div className="flex flex-wrap gap-2">
              <Button size="sm" asChild>
                <Link to="/presupuesto/modelos">{copy.budget.noModel.action}</Link>
              </Button>
              <Button size="sm" variant="secondary" onClick={openIncomeForm}>
                {copy.budget.editIncome}
              </Button>
            </div>
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
          <StatGrid>
            <StatCard
              icon={Wallet}
              // El ancho extra solo cuando sobran columnas. La rejilla es `auto-fit` con
              // columnas de 17rem: a 1129 px entran cuatro, y una primera tarjeta de tres
              // columnas más las otras tres necesitan seis huecos. El resultado era la última
              // tarjeta sola en un segundo renglón con media fila vacía al lado.
              //
              // 102rem es el ancho a partir del cual entran seis columnas —seis veces 17rem
              // más los respiros—, que es cuando el ancho extra no le saca el lugar a nadie.
              className="@[102rem]:col-span-3"
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
                <p className="text-3xl tracking-tight">{copy.budget.noOverBucket}</p>
              )}
            </StatCard>

            <StatCard icon={Coins} label={copy.budget.income}>
              <Amount money={evaluation.data.income} className="block text-left text-2xl" />
            </StatCard>
            <StatCard icon={Receipt} label={copy.budget.consumed}>
              <Amount money={evaluation.data.totalConsumed} className="block text-left text-2xl" />
            </StatCard>
            <StatCard
              icon={PiggyBank}
              label={
                <Hint text={copy.budget.surplusHint}>
                  <span>{copy.budget.surplus}</span>
                </Hint>
              }
            >
              <Amount
                money={evaluation.data.surplus}
                tone={evaluation.data.surplus.minorUnits.startsWith('-') ? 'alert' : 'plain'}
                className="block text-left text-2xl"
              />
            </StatCard>
          </StatGrid>

          {!evaluation.data.incomeDeclared && !editingIncome ? (
            <EmptyState
              title={copy.budget.noIncome.title}
              description={copy.budget.noIncome.description}
              action={
                <Button size="sm" onClick={openIncomeForm}>
                  {copy.budget.noIncome.action}
                </Button>
              }
            />
          ) : null}

          {evaluation.data.incomeDeclared && !editingIncome ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={openIncomeForm}
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

      {/* Fuera de las ramas de arriba: se abre tanto sin modelo como con la evaluación
          completa, y en ambos casos es el mismo formulario. */}
      <FormDialog
        icon={Wallet}
        open={editingIncome}
        title={copy.budget.editIncome}
        description={copy.budget.incomeHint}
        onOpenChange={setEditingIncome}
      >
        {incomeForm}
      </FormDialog>
    </section>
  )
}

export const Route = createFileRoute('/presupuesto/')({ component: BudgetScreen })
