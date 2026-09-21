import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Download } from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Amount } from '@/features/accounting/amount'
import { copy } from '@/features/accounting/copy'
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

      <ControlBar>
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
          <div className="flex flex-wrap items-end justify-between gap-4 border-y border-border-strong py-4">
            <div>
              <p className="text-xs text-muted-foreground">{copy.trialBalance.difference}</p>
              {/* La cifra se alinea con su etiqueta, no al ancho del párrafo: `.num num-right` trae
                  alineación a la derecha y en un bloque suelto la dejaba flotando. */}
              <Amount
                money={balance.data.difference}
                emphasis="strong"
                tone={balance.data.balances ? 'plain' : 'alert'}
                className="mt-1 block text-left text-3xl tracking-tight"
              />
              <p className="mt-1 max-w-[52ch] text-xs text-muted-foreground">
                {balance.data.balances
                  ? copy.trialBalance.balancedHint
                  : copy.trialBalance.unbalancedHint}
              </p>
            </div>

            <dl className="flex gap-6 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">{copy.trialBalance.columns.debits}</dt>
                <dd>
                  <Amount money={balance.data.totalDebits} />
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">
                  {copy.trialBalance.columns.credits}
                </dt>
                <dd>
                  <Amount money={balance.data.totalCredits} />
                </dd>
              </div>
            </dl>
          </div>

          {balance.data.rows.length === 0 ? (
            <EmptyState
              title={copy.trialBalance.empty.title}
              description={copy.trialBalance.empty.description}
            />
          ) : (
            <div>
              <div className="hidden grid-cols-[1fr_7rem_7rem_8rem] gap-2 border-b border-border pb-1 text-xs text-muted-foreground lg:grid">
                <span>{copy.trialBalance.columns.account}</span>
                <span className="text-right">{copy.trialBalance.columns.debits}</span>
                <span className="text-right">{copy.trialBalance.columns.credits}</span>
                <span className="text-right">{copy.trialBalance.columns.balance}</span>
              </div>

              <ul>
                {balance.data.rows.map((row) => (
                  <li
                    key={row.accountCode}
                    className="grid gap-x-2 gap-y-1 border-b border-border py-2 text-sm lg:grid-cols-[1fr_7rem_7rem_8rem] lg:items-baseline lg:py-1.5"
                  >
                    <Link
                      to="/contabilidad/mayor"
                      search={{ account: row.accountCode, currency, from, to }}
                      className="min-w-0 truncate underline-offset-2 hover:underline"
                      aria-label={copy.trialBalance.viewLedger(row.accountName)}
                    >
                      <span className="num num-right text-xs text-muted-foreground">{row.accountCode}</span>{' '}
                      {row.accountName}
                    </Link>
                    <span className="flex justify-between gap-3 lg:contents">
                      <span className="text-xs text-muted-foreground lg:hidden">
                        {copy.trialBalance.columns.debits}
                      </span>
                      <Amount money={row.debits} />
                    </span>
                    <span className="flex justify-between gap-3 lg:contents">
                      <span className="text-xs text-muted-foreground lg:hidden">
                        {copy.trialBalance.columns.credits}
                      </span>
                      <Amount money={row.credits} />
                    </span>
                    <span className="flex justify-between gap-3 lg:contents">
                      <span className="text-xs text-muted-foreground lg:hidden">
                        {copy.trialBalance.columns.balance}
                      </span>
                      <Amount money={row.balance} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

export const Route = createFileRoute('/contabilidad/comprobacion')({
  component: TrialBalanceScreen,
})
