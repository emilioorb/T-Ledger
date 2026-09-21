import { useState } from 'react'
import { Scale } from 'lucide-react'
import { createFileRoute } from '@tanstack/react-router'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Amount, isNegativeMoney, isZeroMoney } from '@/features/accounting/amount'
import { copy } from '@/features/accounting/copy'
import { ControlBar, CurrencyField, RangeFields } from '@/features/accounting/report-controls'
import { ReportTree } from '@/features/accounting/report-tree'
import type { CurrencyCode, IncomeStatement, Money, ReportNode } from '@/features/accounting/types'
import { useIncomeStatement } from '@/features/accounting/use-accounting'
import { monthEnd, monthStart, today } from '@/lib/dates'

interface BlockProps {
  label: string
  total: Money
  nodes: ReportNode[]
  sign?: string
}

// La cascada es la composición: cada bloque resta del anterior y el resultado cierra abajo
// con el peso mayor de la pantalla. Los bloques van juntos —son una sola cuenta, no tres
// secciones— y el único que se separa es el resultado, que es donde la cuenta cierra.
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

const hasNoRows = (statement: IncomeStatement): boolean =>
  statement.sections.income.length === 0 &&
  statement.sections.costOfRevenue.length === 0 &&
  statement.sections.operatingExpenses.length === 0

const IncomeStatementScreen = () => {
  const [currency, setCurrency] = useState<CurrencyCode>('CRC')
  const [from, setFrom] = useState(monthStart(today()))
  const [to, setTo] = useState(monthEnd(today()))

  const statement = useIncomeStatement(currency, from, to)
  const isLoss = statement.data ? isNegativeMoney(statement.data.result) : false
  // Un período donde todo se canceló sí tuvo movimiento: decir que no lo hubo
  // contradice a la comprobación, que muestra esos mismos débitos y créditos.
  const netZero =
    statement.data !== undefined && !hasNoRows(statement.data) && isZeroMoney(statement.data.result)

  return (
    <section className="space-y-6">
      <header className="max-w-[60ch]">
        <h1 className="text-xl font-semibold tracking-tight">{copy.incomeStatement.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{copy.incomeStatement.description}</p>
      </header>

      <ControlBar separated={false}>
        <CurrencyField value={currency} onChange={setCurrency} />
        <RangeFields from={from} to={to} onFrom={setFrom} onTo={setTo} />
      </ControlBar>

      {statement.isPending ? (
        <div className="space-y-3" role="status" aria-label={copy.common.loading}>
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
      ) : hasNoRows(statement.data) ? (
        <EmptyState
          title={copy.incomeStatement.empty.title}
          description={copy.incomeStatement.empty.description}
        />
      ) : (
        // La cascada entera va en una tarjeta: es una sola cuenta, no tres secciones. Acotada,
        // porque una fila de nombre y cifra deja de leerse si se estira, y alineada a la
        // izquierda como el título y los filtros: centrarla la dejaba flotando sola.
        <Card size="sm" className="max-w-3xl gap-4 px-4">
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
              <h2 className="flex items-center gap-2 text-base font-medium tracking-tight">
                <Scale className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                {copy.incomeStatement.result}
              </h2>
              <p className="max-w-[60ch] text-xs text-muted-foreground">
                {netZero
                  ? copy.incomeStatement.netZero
                  : isLoss
                    ? copy.incomeStatement.loss
                    : copy.incomeStatement.profit}
              </p>
            </div>
            <Amount
              money={statement.data.result}
              emphasis="strong"
              className="shrink-0 text-3xl tracking-tight"
            />
          </div>
        </Card>
      )}
    </section>
  )
}

export const Route = createFileRoute('/contabilidad/resultados')({
  component: IncomeStatementScreen,
})
