import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Amount, isZeroMoney } from '@/features/accounting/amount'
import { copy } from '@/features/accounting/copy'
import { ControlBar, CurrencyField, RangeFields } from '@/features/accounting/report-controls'
import { ReportTree } from '@/features/accounting/report-tree'
import type { CurrencyCode, Money, ReportNode } from '@/features/accounting/types'
import { useIncomeStatement } from '@/features/accounting/use-accounting'
import { monthEnd, monthStart, today } from '@/lib/dates'

interface BlockProps {
  label: string
  total: Money
  nodes: ReportNode[]
  sign?: string
}

// La cascada es la composición: cada bloque resta del anterior y el resultado cierra
// abajo con el peso mayor de la pantalla.
const Block = ({ label, total, nodes, sign }: BlockProps) => (
  <section>
    <header className="flex items-baseline justify-between gap-3 border-b border-border-strong pb-1.5">
      <h2 className="text-sm font-medium tracking-tight">
        {sign ? <span className="mr-1 text-muted-foreground">{sign}</span> : null}
        {label}
      </h2>
      <Amount money={total} emphasis="strong" className="text-base" />
    </header>
    {nodes.length > 0 ? (
      <div className="mt-1">
        <ReportTree nodes={nodes} />
      </div>
    ) : null}
  </section>
)

const IncomeStatementScreen = () => {
  const [currency, setCurrency] = useState<CurrencyCode>('CRC')
  const [from, setFrom] = useState(monthStart(today()))
  const [to, setTo] = useState(monthEnd(today()))

  const statement = useIncomeStatement(currency, from, to)
  const isLoss = statement.data ? statement.data.result.minorUnits.startsWith('-') : false

  return (
    <section className="space-y-6">
      <header className="max-w-[60ch]">
        <h1 className="text-xl font-semibold tracking-tight">{copy.incomeStatement.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{copy.incomeStatement.description}</p>
      </header>

      <ControlBar>
        <CurrencyField value={currency} onChange={setCurrency} />
        <RangeFields from={from} to={to} onFrom={setFrom} onTo={setTo} />
      </ControlBar>

      {statement.isPending ? (
        <div className="space-y-3" aria-label={copy.common.loading}>
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))}
        </div>
      ) : statement.isError ? (
        <ErrorState
          title={copy.common.error.title}
          description={copy.common.error.description}
          retryLabel={copy.common.retry}
          onRetry={() => void statement.refetch()}
        />
      ) : isZeroMoney(statement.data.income) &&
        isZeroMoney(statement.data.costOfRevenue) &&
        isZeroMoney(statement.data.operatingExpenses) ? (
        <EmptyState
          title={copy.incomeStatement.empty.title}
          description={copy.incomeStatement.empty.description}
        />
      ) : (
        <div className="max-w-3xl space-y-7">
          <Block
            label={copy.incomeStatement.income}
            total={statement.data.income}
            nodes={statement.data.sections.income}
          />
          <Block
            label={copy.incomeStatement.costOfRevenue}
            total={statement.data.costOfRevenue}
            nodes={statement.data.sections.costOfRevenue}
            sign="−"
          />
          <Block
            label={copy.incomeStatement.operatingExpenses}
            total={statement.data.operatingExpenses}
            nodes={statement.data.sections.operatingExpenses}
            sign="−"
          />

          <div className="flex items-baseline justify-between gap-3 border-t-2 border-border-strong pt-4">
            <div>
              <h2 className="text-base font-medium tracking-tight">
                {copy.incomeStatement.result}
              </h2>
              <p className="text-xs text-muted-foreground">
                {isLoss ? copy.incomeStatement.loss : copy.incomeStatement.profit}
              </p>
            </div>
            <Amount
              money={statement.data.result}
              emphasis="strong"
              className="text-3xl tracking-tight"
            />
          </div>
        </div>
      )}
    </section>
  )
}

export const Route = createFileRoute('/contabilidad/resultados')({
  component: IncomeStatementScreen,
})
