import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { copy } from '@/features/accounting/copy'
import type { PeriodSummary } from '@/features/accounting/types'
import { useClosePeriod, usePeriods, useReopenPeriod } from '@/features/accounting/use-accounting'
import { monthEnd, formatIsoMonth } from '@/lib/dates'
import { cn } from '@/lib/utils'

// El servidor nombra el mes como 2026-08 y la pantalla como 08/2026: convivir las dos
// formas en la misma frase hace dudar de si hablan del mismo mes.
const previousOf = (period: string): string => {
  const [year, month] = period.split('-').map(Number)
  if (!year || !month) return period
  return month === 1
    ? `${year - 1}-12`
    : `${year}-${String(month - 1).padStart(2, '0')}`
}

const blockerLabel = (code: string): string =>
  code in copy.closing.blockerCodes
    ? copy.closing.blockerCodes[code as keyof typeof copy.closing.blockerCodes]
    : code

interface RowProps {
  summary: PeriodSummary
  onClose: () => void
  onReopen: () => void
}

// Cada mes es un bloque, no una fila de celdas: lo que importa de un mes es qué le falta
// para cerrar, y eso es una lista, no un valor.
const PeriodBlock = ({ summary, onClose, onReopen }: RowProps) => {
  const isClosed = summary.status === 'CLOSED'
  const blockers = summary.blockers.filter((blocker) => blocker.code !== 'ALREADY_CLOSED')
  const canClose = !isClosed && summary.blockers.length === 0

  return (
    <li className="grid gap-3 border-b border-border py-4 sm:grid-cols-[8rem_1fr_auto] sm:items-start">
      <div>
        <p className="num text-sm font-medium">{formatIsoMonth(summary.period)}</p>
        <p
          className={cn(
            'mt-0.5 text-xs',
            isClosed ? 'text-muted-foreground' : canClose ? 'text-positive' : 'text-muted-foreground',
          )}
        >
          {isClosed
            ? copy.closing.statuses.CLOSED
            : canClose
              ? copy.closing.ready
              : copy.closing.statuses.OPEN}
        </p>
      </div>

      <div className="min-w-0 space-y-1.5">
        <dl className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
          <div className="flex gap-1.5">
            <dt>{copy.closing.columns.entries}</dt>
            <dd className="num text-foreground">{summary.entryCount}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt>{copy.closing.columns.unposted}</dt>
            <dd
              className={cn(
                'num',
                summary.unpostedMovementCount > 0 ? 'text-warning' : 'text-foreground',
              )}
            >
              {summary.unpostedMovementCount}
            </dd>
          </div>
          <div className="flex gap-1.5">
            <dt>{copy.closing.columns.balanced}</dt>
            <dd className={summary.trialBalanceBalances ? 'text-foreground' : 'text-negative'}>
              {summary.trialBalanceBalances ? copy.closing.balanced : copy.closing.unbalanced}
            </dd>
          </div>
        </dl>

        {/* Todos los bloqueos, no solo el primero: descubrirlos de a uno es tres viajes
            en vez de uno. */}
        {blockers.length > 0 ? (
          <ul className="space-y-1">
            {blockers.map((blocker) => (
              <li key={blocker.code} className="text-sm">
                <span className="text-warning">{blockerLabel(blocker.code)}</span>
                {blocker.code === 'UNPOSTED_MOVEMENTS' ? (
                  <>
                    {' · '}
                    <Link
                      to="/contabilidad/movimientos"
                      search={{ from: `${summary.period}-01`, to: monthEnd(`${summary.period}-01`) }}
                      className="text-muted-foreground underline underline-offset-2 hover:text-foreground"
                    >
                      {copy.closing.goToUnposted}
                    </Link>
                  </>
                ) : null}
                {blocker.code === 'TRIAL_BALANCE_UNBALANCED' ? (
                  <>
                    {' · '}
                    <Link
                      to="/contabilidad/comprobacion"
                      className="text-muted-foreground underline underline-offset-2 hover:text-foreground"
                    >
                      {copy.closing.goToTrialBalance}
                    </Link>
                  </>
                ) : null}
                {blocker.code === 'PREVIOUS_PERIOD_OPEN' ? (
                  <span className="text-muted-foreground">
                    {' · '}
                    {copy.closing.closePreviousFirst(formatIsoMonth(previousOf(summary.period)))}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="flex gap-2">
        {isClosed ? (
          <Button variant="secondary" size="sm" onClick={onReopen}>
            {copy.closing.reopen(formatIsoMonth(summary.period))}
          </Button>
        ) : (
          <Button size="sm" disabled={!canClose} onClick={onClose}>
            {copy.closing.close(formatIsoMonth(summary.period))}
          </Button>
        )}
      </div>
    </li>
  )
}

const ClosingScreen = () => {
  const [closing, setClosing] = useState<PeriodSummary | null>(null)
  const [reopening, setReopening] = useState<PeriodSummary | null>(null)

  const periods = usePeriods()
  const close = useClosePeriod()
  const reopen = useReopenPeriod()

  // De más viejo a más nuevo: los meses se cierran en orden, así que el accionable es
  // el primero de la lista, no el último.
  const items = [...(periods.data?.data ?? [])].sort((a, b) => a.period.localeCompare(b.period))
  // Reabrir arrastra los posteriores cerrados: decir cuántos antes de hacerlo es la
  // diferencia entre una acción y una sorpresa.
  const laterClosed = reopening
    ? items.filter((item) => item.status === 'CLOSED' && item.period > reopening.period).length
    : 0

  return (
    <section className="space-y-6">
      <header className="max-w-[60ch]">
        <h1 className="text-xl font-semibold tracking-tight">{copy.closing.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{copy.closing.description}</p>
      </header>

      {periods.isPending ? (
        <div className="space-y-3" role="status" aria-label={copy.common.loading}>
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-20 w-full" />
          ))}
        </div>
      ) : periods.isError ? (
        <ErrorState
          title={copy.common.error.title}
          description={copy.common.error.description}
          retryLabel={copy.common.retry}
          onRetry={() => void periods.refetch()}
        />
      ) : items.length === 0 ? (
        <EmptyState title={copy.closing.empty.title} description={copy.closing.empty.description} />
      ) : (
        <ul>
          {items.map((summary) => (
            <PeriodBlock
              key={summary.period}
              summary={summary}
              onClose={() => setClosing(summary)}
              onReopen={() => setReopening(summary)}
            />
          ))}
        </ul>
      )}

      <AlertDialog open={closing !== null} onOpenChange={(open) => !open && setClosing(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {copy.closing.confirmClose.title(formatIsoMonth(closing?.period ?? ''))}
            </AlertDialogTitle>
            <AlertDialogDescription>{copy.closing.confirmClose.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{copy.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (closing) close.mutate(closing.period)
                setClosing(null)
              }}
            >
              {copy.closing.confirmClose.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={reopening !== null} onOpenChange={(open) => !open && setReopening(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {copy.closing.confirmReopen.title(formatIsoMonth(reopening?.period ?? ''))}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {copy.closing.confirmReopen.description(laterClosed)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{copy.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (reopening) reopen.mutate(reopening.period)
                setReopening(null)
              }}
            >
              {copy.closing.confirmReopen.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}

export const Route = createFileRoute('/contabilidad/cierre')({ component: ClosingScreen })
