import { useState } from 'react'
import { CalendarClock } from 'lucide-react'
import { createFileRoute } from '@tanstack/react-router'
import { Hint } from '@/components/hint'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/empty-state'
import { FRAME_ROW, FrameHeader, TableFrame } from '@/components/table-frame'
import { ErrorState } from '@/components/error-state'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Amount, isNegativeMoney, isZeroMoney } from '@/features/accounting/amount'
import { ControlBar, CurrencyField } from '@/features/accounting/report-controls'
import type { CurrencyCode } from '@/features/accounting/types'
import { StatCard } from '@/features/accounting/stat-card'
import { copy } from '@/features/projection/copy'
import type { MonthlyFlow } from '@/features/projection/types'
import { useCashFlowProjection } from '@/features/projection/use-projection'
import { formatIsoMonth } from '@/lib/dates'
import { cn } from '@/lib/utils'

const HORIZONS = [6, 12, 24]

const monthLabel = (flow: MonthlyFlow): string =>
  formatIsoMonth(`${flow.year}-${String(flow.month).padStart(2, '0')}`)

interface RowProps {
  flow: MonthlyFlow
  breakdown: boolean
}

// Cada mes es una fila con su excedente; los dos datos que la pantalla existe para
// mostrar —el mes que no cierra y el mes en que se libera una cuota— tienen peso propio.
//
// El desglose de lo comprometido es casi el mismo todos los meses: repetirlo doce veces
// enterraba los dos eventos que sí cambian. Va detrás de un solo interruptor, apagado.
const MonthRow = ({ flow, breakdown }: RowProps) => {
  const negative = isNegativeMoney(flow.surplus)
  const hasFreed = flow.freed.length > 0

  return (
    <li
      className={cn(
        `grid gap-x-3 gap-y-1 ${FRAME_ROW} sm:grid-cols-[6rem_1fr_auto] sm:items-baseline`,
        hasFreed && 'border-border-strong',
      )}
    >
      <span className="num text-sm">{monthLabel(flow)}</span>

      <span className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {negative ? (
          <Hint text={copy.projection.negativeHint}>
            <span className="text-negative">{copy.projection.negative}</span>
          </Hint>
        ) : null}
        {breakdown && !isZeroMoney(flow.debtPayments) ? (
          <span>
            {copy.projection.detail.debtPayments} <Amount money={flow.debtPayments} />
          </span>
        ) : null}
        {breakdown && !isZeroMoney(flow.goalContributions) ? (
          <span>
            {copy.projection.detail.goalContributions} <Amount money={flow.goalContributions} />
          </span>
        ) : null}
        {breakdown && !isZeroMoney(flow.lentCollections) ? (
          <span>
            {copy.projection.detail.lentCollections} <Amount money={flow.lentCollections} />
          </span>
        ) : null}
        {!isZeroMoney(flow.maturingInvestments) ? (
          <span>
            {copy.projection.detail.maturingInvestments} <Amount money={flow.maturingInvestments} />
          </span>
        ) : null}

        {!flow.incomeDeclared ? (
          <Hint text={copy.projection.estimatedIncomeHint}>
            <span>{copy.projection.estimatedIncome}</span>
          </Hint>
        ) : null}

        {flow.freed.map((freed) => (
          <span key={freed.debtId} className="text-positive">
            {copy.projection.freed}: {copy.projection.freedNote(freed.name)}{' '}
            <Amount money={freed.amount} />
          </span>
        ))}
      </span>

      <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 sm:flex-nowrap sm:justify-end">
        <span className="flex items-baseline gap-2 sm:contents">
          <span className="text-xs text-muted-foreground sm:hidden">
            {copy.projection.columns.income}
          </span>
          <Amount money={flow.income} className="text-xs text-muted-foreground sm:w-28" />
        </span>
        <span className="flex items-baseline gap-2 sm:contents">
          <span className="text-xs text-muted-foreground sm:hidden">
            {copy.projection.columns.committed}
          </span>
          <Amount money={flow.committed} className="text-xs text-muted-foreground sm:w-28" />
        </span>
        <span className="flex items-baseline gap-2 sm:contents">
          <span className="text-xs text-muted-foreground sm:hidden">
            {copy.projection.columns.surplus}
          </span>
          <Amount
            money={flow.surplus}
            emphasis={negative || hasFreed ? 'strong' : 'normal'}
            tone={negative ? 'alert' : 'plain'}
            className="text-sm sm:w-32"
          />
        </span>
      </span>
    </li>
  )
}

const ProjectionScreen = () => {
  const [months, setMonths] = useState(12)
  const [currency, setCurrency] = useState<CurrencyCode>('CRC')
  const [breakdown, setBreakdown] = useState(false)

  const projection = useCashFlowProjection(months, currency)
  const flows = projection.data ?? []
  const firstNegative = flows.find((flow) => isNegativeMoney(flow.surplus))

  return (
    <section className="space-y-6">
      <header className="max-w-[60ch]">
        <h1 className="text-xl font-semibold tracking-tight">{copy.projection.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{copy.projection.description}</p>
      </header>

      <ControlBar separated={false}>
        <div className="flex flex-col gap-1">
          <Label htmlFor="horizon" className="text-xs font-normal text-muted-foreground">
            {copy.projection.horizon.label}
          </Label>
          <Select value={String(months)} onValueChange={(next) => setMonths(Number(next))}>
            <SelectTrigger id="horizon" className="h-8 w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HORIZONS.map((horizon) => (
                <SelectItem key={horizon} value={String(horizon)}>
                  {copy.projection.horizon.months(horizon)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <CurrencyField value={currency} onChange={setCurrency} />

        <Hint text={copy.projection.breakdown.hint}>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
            aria-pressed={breakdown}
            onClick={() => setBreakdown((current) => !current)}
          >
            {breakdown ? copy.projection.breakdown.hide : copy.projection.breakdown.show}
          </Button>
        </Hint>
      </ControlBar>

      {projection.isPending ? (
        <div className="space-y-2" role="status" aria-label={copy.common.loading}>
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      ) : projection.isError ? (
        <ErrorState
          title={copy.common.error.title}
          description={copy.common.error.description}
          retryLabel={copy.common.retry}
          onRetry={() => void projection.refetch()}
        />
      ) : flows.length === 0 ? (
        <EmptyState
          title={copy.projection.empty.title}
          description={copy.projection.empty.description}
        />
      ) : (
        <div className="space-y-5">
          {/* El primer mes que no cierra, arriba: enterarse con anticipación es el valor
              entero de proyectar. */}
          <StatCard
            icon={CalendarClock}
            label={copy.projection.horizon.label}
            hint={firstNegative ? copy.projection.negativeHint : undefined}
          >
            {firstNegative ? (
              <p className="text-2xl font-medium tracking-tight text-negative">
                {copy.projection.firstNegative(monthLabel(firstNegative))}
              </p>
            ) : (
              <p className="text-2xl tracking-tight">{copy.projection.allClear}</p>
            )}
          </StatCard>

          <TableFrame>
            <FrameHeader className="hidden grid-cols-[6rem_1fr_auto] gap-3 sm:grid">
              <span>{copy.projection.columns.month}</span>
              <span />
              <span className="flex gap-4">
                <span className="w-28 text-right">{copy.projection.columns.income}</span>
                <span className="w-28 text-right">{copy.projection.columns.committed}</span>
                <span className="w-32 text-right">{copy.projection.columns.surplus}</span>
              </span>
            </FrameHeader>

            <ul className="divide-y divide-border">
              {flows.map((flow) => (
                <MonthRow key={`${flow.year}-${flow.month}`} flow={flow} breakdown={breakdown} />
              ))}
            </ul>
          </TableFrame>
        </div>
      )}
    </section>
  )
}

export const Route = createFileRoute('/proyeccion')({ component: ProjectionScreen })
