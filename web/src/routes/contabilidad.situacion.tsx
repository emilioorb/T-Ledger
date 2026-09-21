import { useState } from 'react'
import { Scale } from 'lucide-react'
import { createFileRoute } from '@tanstack/react-router'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Amount } from '@/features/accounting/amount'
import { copy } from '@/features/accounting/copy'
import { StatCard } from '@/features/accounting/stat-card'
import { ControlBar, CurrencyField, DateField } from '@/features/accounting/report-controls'
import { ReportTree } from '@/features/accounting/report-tree'
import type { CurrencyCode, Money, ReportNode } from '@/features/accounting/types'
import { useFinancialPosition } from '@/features/accounting/use-accounting'
import { today } from '@/lib/dates'
import { TableSkeleton } from '@/components/table-skeleton'

const PERIOD_RESULT_CODE = 'RESULTADO-DEL-PERIODO'

interface SectionProps {
  label: string
  nodes: ReportNode[]
  total: Money
  derivedCode?: string
  derivedHint?: string
}

// Una sección sin cuentas igual tiene un saldo, y es cero. Dejar el encabezado solo,
// sin cifra, obliga a deducir si el pasivo es cero o si el reporte se rompió.
//
// La tarjeta le pone un borde a cada lado de la identidad: sin ella, en pantalla ancha las
// dos columnas flotan sueltas y la fila se estira hasta separar el nombre de su cifra.
const Section = ({ label, nodes, total, derivedCode, derivedHint }: SectionProps) => (
  <Card size="sm" className="px-4">
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="text-base font-medium tracking-tight">{label}</h2>
      {nodes.length === 0 ? <Amount money={total} className="text-sm" /> : null}
    </div>
    {nodes.length > 0 ? (
      <div className="-mt-1">
        <ReportTree nodes={nodes} derivedCode={derivedCode} derivedHint={derivedHint} />
      </div>
    ) : null}
  </Card>
)

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
        <div className="space-y-5">
          <Skeleton className="h-24 w-full rounded-xl" />
          <TableSkeleton rows={6} label={copy.common.loading} />
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
          {/* La identidad entera en una tarjeta: es una sola afirmación, no tres cifras
              sueltas, y partirla en tarjetas perdería el «igual» y el «más». */}
          <StatCard
            icon={Scale}
            label={copy.financialPosition.identity}
            hint={
              position.data.balances
                ? copy.financialPosition.balanced
                : copy.financialPosition.unbalanced
            }
          >
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <Amount
                money={position.data.assets}
                emphasis="strong"
                className="text-3xl tracking-tight"
              />
              <span className="text-2xl text-muted-foreground">=</span>
              <Amount money={position.data.liabilities} className="text-2xl" />
              <span className="text-2xl text-muted-foreground">+</span>
              <Amount money={position.data.equity} className="text-2xl" />
            </div>
          </StatCard>

          {position.data.sections.assets.length === 0 &&
          position.data.sections.liabilities.length === 0 ? (
            <EmptyState
              title={copy.financialPosition.empty.title}
              description={copy.financialPosition.empty.description}
            />
          ) : (
            <div className="grid items-start gap-4 lg:grid-cols-2">
              <Section
                label={copy.financialPosition.assets}
                nodes={position.data.sections.assets}
                total={position.data.assets}
              />

              <div className="space-y-4">
                <Section
                  label={copy.financialPosition.liabilities}
                  nodes={position.data.sections.liabilities}
                  total={position.data.liabilities}
                />
                <Section
                  label={copy.financialPosition.equity}
                  nodes={position.data.sections.equity}
                  total={position.data.equity}
                  derivedCode={PERIOD_RESULT_CODE}
                  derivedHint={copy.financialPosition.periodResultHint}
                />
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
