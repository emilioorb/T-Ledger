import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Amount } from '@/features/accounting/amount'
import { copy } from '@/features/accounting/copy'
import { ControlBar, CurrencyField, DateField } from '@/features/accounting/report-controls'
import { ReportTree } from '@/features/accounting/report-tree'
import type { CurrencyCode } from '@/features/accounting/types'
import { useFinancialPosition } from '@/features/accounting/use-accounting'
import { today } from '@/lib/dates'

const PERIOD_RESULT_CODE = 'RESULTADO-DEL-PERIODO'

const FinancialPositionScreen = () => {
  const [currency, setCurrency] = useState<CurrencyCode>('CRC')
  const [at, setAt] = useState(today())

  const position = useFinancialPosition(currency, at)

  return (
    <section className="space-y-6">
      <header className="max-w-[60ch]">
        <h1 className="text-xl font-semibold tracking-tight">{copy.financialPosition.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{copy.financialPosition.description}</p>
      </header>

      <ControlBar>
        <CurrencyField value={currency} onChange={setCurrency} />
        <DateField id="at" label={copy.common.at} value={at} onChange={setAt} />
      </ControlBar>

      {position.isPending ? (
        <div className="space-y-2" aria-label={copy.common.loading}>
          <Skeleton className="h-20 w-full" />
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-8 w-full" />
          ))}
        </div>
      ) : position.isError ? (
        <ErrorState
          title={copy.common.error.title}
          description={copy.common.error.description}
          retryLabel={copy.common.retry}
          onRetry={() => void position.refetch()}
        />
      ) : (
        <div className="space-y-8">
          {/* La identidad, resuelta con sus tres números: es la única cifra de esta
              pantalla que se mira antes que el detalle. */}
          <div className="border-y border-border-strong py-4">
            <p className="text-xs text-muted-foreground">{copy.financialPosition.identity}</p>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <Amount
                money={position.data.assets}
                emphasis="strong"
                className="text-2xl tracking-tight"
              />
              <span className="text-lg text-muted-foreground">=</span>
              <Amount money={position.data.liabilities} className="text-lg" />
              <span className="text-lg text-muted-foreground">+</span>
              <Amount money={position.data.equity} className="text-lg" />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {position.data.balances
                ? copy.financialPosition.balanced
                : copy.financialPosition.unbalanced}
            </p>
          </div>

          {position.data.sections.assets.length === 0 &&
          position.data.sections.liabilities.length === 0 ? (
            <EmptyState
              title={copy.financialPosition.empty.title}
              description={copy.financialPosition.empty.description}
            />
          ) : (
            <div className="grid gap-8 lg:grid-cols-2">
              <div>
                <h2 className="text-sm font-medium tracking-tight">
                  {copy.financialPosition.assets}
                </h2>
                <div className="mt-2">
                  <ReportTree nodes={position.data.sections.assets} />
                </div>
              </div>

              <div className="space-y-8">
                <div>
                  <h2 className="text-sm font-medium tracking-tight">
                    {copy.financialPosition.liabilities}
                  </h2>
                  <div className="mt-2">
                    <ReportTree nodes={position.data.sections.liabilities} />
                  </div>
                </div>

                <div>
                  <h2 className="text-sm font-medium tracking-tight">
                    {copy.financialPosition.equity}
                  </h2>
                  <div className="mt-2">
                    <ReportTree
                      nodes={position.data.sections.equity}
                      derivedCode={PERIOD_RESULT_CODE}
                      derivedHint={copy.financialPosition.periodResultHint}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

export const Route = createFileRoute('/contabilidad/situacion')({
  component: FinancialPositionScreen,
})
