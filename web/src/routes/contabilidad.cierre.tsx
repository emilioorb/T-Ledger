import { useState, type ReactNode } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { EmptyState } from '@/components/empty-state'
import { FrameHeader, TableFrame } from '@/components/table-frame'
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
import { TEXT_LINK } from '@/components/text-link'

// El servidor nombra el mes como 2026-08 y la pantalla como 08/2026: convivir las dos
// formas en la misma frase hace dudar de si hablan del mismo mes.
const previousOf = (period: string): string => {
  const [year, month] = period.split('-').map(Number)
  if (!year || !month) return period
  return month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, '0')}`
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

// Encabezado y filas comparten la plantilla. Bajo lg la fila se parte en bloques y cada
// celda lleva su etiqueta: una tabla de siete columnas no cabe en un teléfono.
// Las pistas de monto quedan fijas —un monto no se parte— y la de texto cede. La fila mide
// el contenedor: con la barra lateral abierta, `lg` encendía siete columnas cuando el
// contenido tenía 745 px.
const COLS =
  '@4xl:grid-cols-[5.5rem_6rem_5rem_9rem_7rem_minmax(0,1fr)_auto] @4xl:items-baseline @4xl:gap-x-4'

// Qué falta para cerrar, escrito: es la columna que decide si el botón sirve, y decirlo
// «nada» es tan informativo como decir qué bloquea.
const Blockers = ({ summary }: { summary: PeriodSummary }) => {
  const blockers = summary.blockers.filter((blocker) => blocker.code !== 'ALREADY_CLOSED')
  if (blockers.length === 0) {
    return <span className="text-muted-foreground">{copy.closing.nothingBlocking}</span>
  }

  return (
    <ul className="space-y-1">
      {blockers.map((blocker) => (
        <li key={blocker.code}>
          <span className="text-warning">{blockerLabel(blocker.code)}</span>
          {blocker.code === 'UNPOSTED_MOVEMENTS' ? (
            <>
              {' · '}
              <Link
                to="/contabilidad/movimientos"
                search={{ from: `${summary.period}-01`, to: monthEnd(`${summary.period}-01`) }}
                className={TEXT_LINK}
              >
                {copy.closing.goToUnposted}
              </Link>
            </>
          ) : null}
          {blocker.code === 'TRIAL_BALANCE_UNBALANCED' ? (
            <>
              {' · '}
              <Link to="/contabilidad/comprobacion" className={TEXT_LINK}>
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
  )
}

// La etiqueta solo existe en la fila angosta: con las columnas a la vista, repetirla sería ruido.
const Cell = ({ label, children }: { label: string; children: ReactNode }) => (
  <span className="flex items-baseline justify-between gap-3 @4xl:contents">
    <span className="text-xs text-muted-foreground @4xl:hidden">{label}</span>
    {children}
  </span>
)

const PeriodRow = ({ summary, onClose, onReopen }: RowProps) => {
  const isClosed = summary.status === 'CLOSED'
  const canClose = !isClosed && summary.blockers.length === 0

  return (
    <li className={cn('grid gap-x-4 gap-y-1.5 px-3 py-2.5 text-sm', COLS)}>
      <span className="num font-medium">{formatIsoMonth(summary.period)}</span>

      <span className={isClosed ? 'text-muted-foreground' : 'text-foreground'}>
        {isClosed ? copy.closing.statuses.CLOSED : copy.closing.statuses.OPEN}
      </span>

      <Cell label={copy.closing.columns.entries}>
        <span className="num">{summary.entryCount}</span>
      </Cell>

      <Cell label={copy.closing.columns.unposted}>
        <span className={cn('num', summary.unpostedMovementCount > 0 && 'text-warning')}>
          {summary.unpostedMovementCount}
        </span>
      </Cell>

      <Cell label={copy.closing.columns.balanced}>
        <span className={summary.trialBalanceBalances ? undefined : 'text-negative'}>
          {summary.trialBalanceBalances ? copy.closing.balanced : copy.closing.unbalanced}
        </span>
      </Cell>

      <span className="min-w-0 text-xs @4xl:text-sm">
        <Blockers summary={summary} />
      </span>

      <span className="justify-self-end">
        {isClosed ? (
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onReopen}>
            {copy.closing.reopen(formatIsoMonth(summary.period))}
          </Button>
        ) : (
          <Button size="sm" className="h-7 px-2 text-xs" disabled={!canClose} onClick={onClose}>
            {copy.closing.close(formatIsoMonth(summary.period))}
          </Button>
        )}
      </span>
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
        <TableFrame>
          <FrameHeader className={cn('hidden gap-x-4 @4xl:grid', COLS)}>
            <span>{copy.closing.columns.period}</span>
            <span>{copy.closing.columns.status}</span>
            <span>{copy.closing.columns.entries}</span>
            <span>{copy.closing.columns.unposted}</span>
            <span>{copy.closing.columns.balanced}</span>
            <span>{copy.closing.columns.blockers}</span>
            <span />
          </FrameHeader>

          <ul className="divide-y divide-border">
            {items.map((summary) => (
              <PeriodRow
                key={summary.period}
                summary={summary}
                onClose={() => setClosing(summary)}
                onReopen={() => setReopening(summary)}
              />
            ))}
          </ul>
        </TableFrame>
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
