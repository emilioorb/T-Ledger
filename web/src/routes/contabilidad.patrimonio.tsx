import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { Hint } from '@/components/hint'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Amount, isZeroMoney } from '@/features/accounting/amount'
import { copy } from '@/features/accounting/copy'
import { StatCard, StatGrid } from '@/features/accounting/stat-card'
import { ControlBar, DateField } from '@/features/accounting/report-controls'
import type { CurrencyBreakdown } from '@/features/accounting/types'
import { useNetWorth } from '@/features/accounting/use-accounting'
import { ApiError } from '@/lib/api'
import { today } from '@/lib/dates'
import { cn } from '@/lib/utils'

const CurrencyRow = ({ row }: { row: CurrencyBreakdown }) => (
  <li className="grid grid-cols-[4rem_1fr_auto] items-baseline gap-x-4 gap-y-1 border-b border-border py-2.5 text-sm">
    <span className="num">{row.currency}</span>
    <span className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
      <Amount money={row.netWorthNative} className="text-sm" />
      {row.rate !== '1' ? (
        <span className="num text-xs text-muted-foreground">× {row.rate}</span>
      ) : null}
    </span>
    <Amount money={row.netWorthTranslated} emphasis="strong" className="text-sm" />
  </li>
)

const NetWorthScreen = () => {
  const [at, setAt] = useState(today())
  const report = useNetWorth(at)

  const noRate =
    report.error instanceof ApiError && report.error.code === 'SEMANTIC_VALIDATION_ERROR'

  const foreign = (report.data?.byCurrency ?? []).find((row) => row.rate !== '1')

  return (
    <section className="space-y-6">
      <header className="max-w-[60ch]">
        <h1 className="text-xl font-semibold tracking-tight">{copy.netWorth.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{copy.netWorth.description}</p>
      </header>

      <ControlBar separated={false}>
        <DateField id="at" label={copy.netWorth.at} value={at} onChange={setAt} />
      </ControlBar>

      {report.isPending ? (
        <div className="space-y-3" role="status" aria-label={copy.common.loading}>
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : noRate ? (
        <EmptyState
          title={copy.netWorth.noRate.title}
          description={copy.netWorth.noRate.description}
          action={
            <Button variant="secondary" size="sm" asChild>
              <Link to="/">{copy.netWorth.noRate.action}</Link>
            </Button>
          }
        />
      ) : report.isError ? (
        <ErrorState
          title={copy.common.error.title}
          description={copy.common.error.description}
          retryLabel={copy.common.retry}
          onRetry={() => void report.refetch()}
        />
      ) : (
        <div className="space-y-7">
          {/* La cifra y, pegada a ella, la tasa con que se armó. Un número que suma dos
              monedas sin decir a cuánto las sumó no es verificable. */}
          <StatGrid>
            <StatCard
              className="sm:col-span-2"
              label={copy.netWorth.total}
              hint={foreign ? copy.netWorth.rateNote(foreign.rate) : copy.netWorth.description}
            >
              <Amount
                money={report.data.netWorth}
                emphasis="strong"
                tone={report.data.netWorth.minorUnits.startsWith('-') ? 'alert' : 'plain'}
                className="block text-left text-3xl tracking-tight"
              />
            </StatCard>
            <StatCard label={copy.netWorth.assets}>
              <Amount money={report.data.assets} className="block text-left text-lg" />
            </StatCard>
            <StatCard label={copy.netWorth.liabilities}>
              <Amount money={report.data.liabilities} className="block text-left text-lg" />
            </StatCard>
          </StatGrid>

          {/* Cuánto del patrimonio es lo que hiciste y cuánto es lo que hizo la tasa. */}
          <div>
            <p className="text-xs text-muted-foreground">{copy.netWorth.identity}</p>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <Amount money={report.data.netWorth} emphasis="strong" className="text-lg" />
              <span className="text-sm text-muted-foreground">=</span>
              <Amount money={report.data.equity} className="text-lg" />
              <span className="text-sm text-muted-foreground">+</span>
              <Hint text={copy.netWorth.exchangeHint}>
                <Amount
                  money={report.data.exchangeDifference}
                  className={cn(
                    'text-lg',
                    !isZeroMoney(report.data.exchangeDifference) && 'text-warning',
                  )}
                />
              </Hint>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {report.data.balances ? copy.netWorth.balanced : copy.netWorth.unbalanced}
            </p>
          </div>

          {report.data.byCurrency.length === 0 ? (
            <EmptyState
              title={copy.netWorth.empty.title}
              description={copy.netWorth.empty.description}
            />
          ) : (
            <div>
              <h2 className="text-sm font-medium tracking-tight">{copy.netWorth.byCurrency}</h2>
              <p className="mt-0.5 max-w-[65ch] text-xs text-muted-foreground">
                {copy.netWorth.bridgeNote}
              </p>

              <div className="mt-2 grid grid-cols-[4rem_1fr_auto] gap-x-4 border-b border-border pb-1 text-xs text-muted-foreground">
                <span>{copy.netWorth.columns.currency}</span>
                <span>{copy.netWorth.columns.native}</span>
                <span className="text-right">{copy.netWorth.columns.translated}</span>
              </div>

              <ul>
                {report.data.byCurrency.map((row) => (
                  <CurrencyRow key={row.currency} row={row} />
                ))}
              </ul>

              {/* El árbol de cuentas vive en Situación, que ya lo hace por moneda: repetirlo
                  acá sería una tabla más diciendo lo mismo. */}
              <Button variant="ghost" size="sm" className="mt-3 text-muted-foreground" asChild>
                <Link to="/contabilidad/situacion">{copy.netWorth.goToPosition}</Link>
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

export const Route = createFileRoute('/contabilidad/patrimonio')({ component: NetWorthScreen })
