import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Skeleton } from '@/components/ui/skeleton'
import { formatIsoDate } from '@/lib/dates'
import { formatMoney, parseMoneyInput } from '@/lib/money'
import { copy } from './copy'
import type { Debt, Projection, SimulateInput } from './types'
import { useSimulateExtraPayment } from './use-debts'

interface Props {
  debt: Debt
}

const lastDueDate = (projection: Projection): string =>
  projection.withExtraPayment.installments.at(-1)?.dueDate ?? ''

export const ExtraPaymentSimulator = ({ debt }: Props) => {
  const [amount, setAmount] = useState('')
  const [afterInstallment, setAfterInstallment] = useState('1')
  const [mode, setMode] = useState<SimulateInput['mode']>('REDUCE_TERM')
  const simulate = useSimulateExtraPayment(debt.id)

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    try {
      simulate.mutate({
        amount: parseMoneyInput(amount, debt.principal.currency),
        afterInstallment: Number(afterInstallment),
        mode,
      })
    } catch {
      toast.error(copy.toast.invalidAmount)
    }
  }

  const projection = simulate.data

  return (
    <section aria-labelledby="simulador" className="space-y-4">
      <div>
        <h2 id="simulador" className="text-base font-medium tracking-tight">
          {copy.simulator.title}
        </h2>
        <p className="mt-0.5 max-w-[65ch] text-sm text-muted-foreground">
          {copy.simulator.description}
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="sim-amount">{copy.simulator.amount.label}</Label>
            <Input
              id="sim-amount"
              inputMode="decimal"
              className="num"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sim-after">{copy.simulator.afterInstallment.label}</Label>
            <Input
              id="sim-after"
              type="number"
              min={1}
              max={debt.termMonths - 1}
              className="num"
              value={afterInstallment}
              onChange={(event) => setAfterInstallment(event.target.value)}
              aria-describedby="sim-after-hint"
              required
            />
            <p id="sim-after-hint" className="text-xs text-muted-foreground">
              {copy.simulator.afterInstallment.hint}
            </p>
          </div>
        </div>

        {/* Dos opciones: se ven las dos sin abrir nada. */}
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">{copy.simulator.mode.label}</legend>
          <RadioGroup
            value={mode}
            onValueChange={(value) => setMode(value as SimulateInput['mode'])}
            className="gap-2"
          >
            <div className="flex items-start gap-2">
              <RadioGroupItem value="REDUCE_TERM" id="mode-term" className="mt-1" />
              <Label htmlFor="mode-term" className="flex-col items-start gap-0.5 font-normal">
                <span className="font-medium">{copy.simulator.mode.reduceTerm}</span>
                <span className="text-xs text-muted-foreground">
                  {copy.simulator.mode.reduceTermHint}
                </span>
              </Label>
            </div>
            <div className="flex items-start gap-2">
              <RadioGroupItem value="REDUCE_PAYMENT" id="mode-payment" className="mt-1" />
              <Label htmlFor="mode-payment" className="flex-col items-start gap-0.5 font-normal">
                <span className="font-medium">{copy.simulator.mode.reducePayment}</span>
                <span className="text-xs text-muted-foreground">
                  {copy.simulator.mode.reducePaymentHint}
                </span>
              </Label>
            </div>
          </RadioGroup>
        </fieldset>

        <Button type="submit" disabled={simulate.isPending}>
          {copy.simulator.submit}
        </Button>
      </form>

      {/* El resultado aparece en la misma pantalla, no en un modal: cambiar un número
          y volver a simular no puede costar abrir y cerrar nada. */}
      {simulate.isPending ? (
        <div className="space-y-2 border-t border-border pt-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      ) : null}

      {projection && !simulate.isPending ? (
        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-medium">{copy.simulator.results.title}</h3>
          <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
            <div className="flex items-baseline justify-between gap-4 border-b border-border pb-1.5">
              <dt className="text-sm text-muted-foreground">
                {copy.simulator.results.interestSaved}
              </dt>
              <dd className="num text-sm font-medium text-positive">
                {formatMoney(projection.interestSaved)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-b border-border pb-1.5">
              <dt className="text-sm text-muted-foreground">
                {copy.simulator.results.monthsSaved}
              </dt>
              <dd className="num text-sm font-medium">
                {copy.simulator.results.months(projection.monthsSaved)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-b border-border pb-1.5">
              <dt className="text-sm text-muted-foreground">
                {copy.simulator.results.newPayoffDate}
              </dt>
              <dd className="num text-sm">{formatIsoDate(lastDueDate(projection))}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-b border-border pb-1.5">
              <dt className="text-sm text-muted-foreground">{copy.simulator.results.totalPaid}</dt>
              <dd className="num text-sm">{formatMoney(projection.totalPaidWithExtra)}</dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-muted-foreground">
            {copy.simulator.results.baselineTotal}{' '}
            <span className="num">{formatMoney(projection.baseline.totalPaid)}</span>
          </p>
        </div>
      ) : null}
    </section>
  )
}
