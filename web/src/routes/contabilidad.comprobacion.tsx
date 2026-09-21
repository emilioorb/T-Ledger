import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowDownLeft, ArrowUpRight, Download, Scale } from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
import { FRAME_ROW, FrameHeader, TableFrame } from '@/components/table-frame'
import { ErrorState } from '@/components/error-state'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Amount } from '@/features/accounting/amount'
import { copy } from '@/features/accounting/copy'
import { StatCard, StatGrid } from '@/features/accounting/stat-card'
import { ControlBar, CurrencyField, RangeFields } from '@/features/accounting/report-controls'
import type { CurrencyCode } from '@/features/accounting/types'
import { trialBalanceCsvUrl, useTrialBalance } from '@/features/accounting/use-accounting'
import { monthEnd, monthStart, today } from '@/lib/dates'

const TrialBalanceScreen = () => {
  const [currency, setCurrency] = useState<CurrencyCode>('CRC')
  const [from, setFrom] = useState(monthStart(today()))
  const [to, setTo] = useState(monthEnd(today()))

  const balance = useTrialBalance(currency, from, to)

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-[60ch]">
          <h1 className="text-xl font-semibold tracking-tight">{copy.trialBalance.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{copy.trialBalance.description}</p>
        </div>
        <Button variant="secondary" size="sm" asChild>
          <a href={trialBalanceCsvUrl(currency, from, to)} download>
            <Download className="size-4" aria-hidden="true" />
            {copy.common.exportCsv}
          </a>
        </Button>
      </header>

      <ControlBar separated={false}>
        <CurrencyField value={currency} onChange={setCurrency} />
        <RangeFields from={from} to={to} onFrom={setFrom} onTo={setTo} />
      </ControlBar>

      {balance.isPending ? (
        <div className="space-y-2" role="status" aria-label={copy.common.loading}>
          <Skeleton className="h-16 w-64" />
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-8 w-full" />
          ))}
        </div>
      ) : balance.isError ? (
        <ErrorState
          title={copy.common.error.title}
          description={copy.common.error.description}
          retryLabel={copy.common.retry}
          onRetry={() => void balance.refetch()}
        />
      ) : (
        <div className="space-y-6">
          {/* La diferencia se muestra siempre, cuadre o no: un indicador que solo aparece
              cuando algo está mal enseña a no mirarlo. */}
          <StatGrid>
            {/* La cifra se alinea con su etiqueta, no al ancho de la tarjeta: `.num num-right`
                trae alineación a la derecha y en un bloque suelto la dejaba flotando. */}
            <StatCard
              icon={Scale}
              className="sm:col-span-2"
              label={copy.trialBalance.difference}
              hint={
                balance.data.balances
                  ? copy.trialBalance.balancedHint
                  : copy.trialBalance.unbalancedHint
              }
            >
              <Amount
                money={balance.data.difference}
                emphasis="strong"
                tone={balance.data.balances ? 'plain' : 'alert'}
                className="block text-left text-3xl tracking-tight"
              />
            </StatCard>
            <StatCard icon={ArrowDownLeft} label={copy.trialBalance.columns.debits}>
              <Amount money={balance.data.totalDebits} className="block text-left text-2xl" />
            </StatCard>
            <StatCard icon={ArrowUpRight} label={copy.trialBalance.columns.credits}>
              <Amount money={balance.data.totalCredits} className="block text-left text-2xl" />
            </StatCard>
          </StatGrid>

          {balance.data.rows.length === 0 ? (
            <EmptyState
              title={copy.trialBalance.empty.title}
              description={copy.trialBalance.empty.description}
            />
          ) : (
            <TableFrame>
              <FrameHeader className="hidden grid-cols-[minmax(0,1fr)_8rem_8rem_8rem] gap-2 @3xl:grid">
                <span>{copy.trialBalance.columns.account}</span>
                <span className="text-right">{copy.trialBalance.columns.debits}</span>
                <span className="text-right">{copy.trialBalance.columns.credits}</span>
                <span className="text-right">{copy.trialBalance.columns.balance}</span>
              </FrameHeader>

              <ul className="divide-y divide-border">
                {balance.data.rows.map((row) => (
                  <li
                    key={row.accountCode}
                    className={`grid gap-x-2 gap-y-1 ${FRAME_ROW} text-sm @3xl:grid-cols-[minmax(0,1fr)_8rem_8rem_8rem] @3xl:items-baseline`}
                  >
                    <Link
                      to="/contabilidad/mayor"
                      search={{ account: row.accountCode, currency, from, to }}
                      className="min-w-0 truncate underline-offset-2 hover:underline"
                      aria-label={copy.trialBalance.viewLedger(row.accountName)}
                    >
                      <span className="num num-right text-xs text-muted-foreground">
                        {row.accountCode}
                      </span>{' '}
                      {row.accountName}
                    </Link>
                    <span className="flex justify-between gap-3 @3xl:contents">
                      <span className="text-xs text-muted-foreground @3xl:hidden">
                        {copy.trialBalance.columns.debits}
                      </span>
                      <Amount money={row.debits} />
                    </span>
                    <span className="flex justify-between gap-3 @3xl:contents">
                      <span className="text-xs text-muted-foreground @3xl:hidden">
                        {copy.trialBalance.columns.credits}
                      </span>
                      <Amount money={row.credits} />
                    </span>
                    <span className="flex justify-between gap-3 @3xl:contents">
                      <span className="text-xs text-muted-foreground @3xl:hidden">
                        {copy.trialBalance.columns.balance}
                      </span>
                      <Amount money={row.balance} />
                    </span>
                  </li>
                ))}
              </ul>
            </TableFrame>
          )}
        </div>
      )}
    </section>
  )
}

export const Route = createFileRoute('/contabilidad/comprobacion')({
  component: TrialBalanceScreen,
})
