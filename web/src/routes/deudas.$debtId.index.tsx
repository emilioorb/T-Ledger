import { createFileRoute } from '@tanstack/react-router'
import {
  Building2,
  CalendarCheck,
  Coins,
  Percent,
  TableProperties,
  Timer,
  Landmark,
  Wallet,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Amount } from '@/features/accounting/amount'
import { StatCard, StatGrid } from '@/features/accounting/stat-card'
import { AmortizationTable } from '@/features/debts/amortization-table'
import { PagosDeLaDeuda } from '@/features/debts/pagos-de-la-deuda'
import { BalanceChart } from '@/features/debts/balance-chart'
import { copy } from '@/features/debts/copy'
import { cuotasRestantes } from '@/features/debts/cuotas-restantes'
import { ErrorState } from '@/components/error-state'
import { ExtraPaymentSimulator } from '@/features/debts/extra-payment-simulator'
import { useDebt, useSchedule } from '@/features/debts/use-debts'
import { formatIsoDate } from '@/lib/dates'
import { Screen } from '@/components/screen'

const DebtDetail = () => {
  const { debtId } = Route.useParams()
  const debt = useDebt(debtId)
  const schedule = useSchedule(debtId)

  if (debt.isPending) {
    return (
      <Screen title={copy.nav.debts}>
        <div className="space-y-4" role="status" aria-label={copy.list.loading} aria-busy="true">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </Screen>
    )
  }

  if (debt.isError || !debt.data)
    return (
      <Screen title={copy.nav.debts}>
        <ErrorState
          title={copy.error.title}
          description={copy.error.description}
          retryLabel={copy.error.retry}
          onRetry={() => void debt.refetch()}
        />
      </Screen>
    )

  const { data } = debt

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1 className="text-xl font-semibold tracking-tight">{data.name}</h1>

        {/* La cuota es lo que se paga todos los meses: esa abre la pantalla, y la fecha en
            que la deuda deja de existir va al lado. El resto son datos de apoyo. */}
        <StatGrid>
          <StatCard
            icon={Coins}
            className="@xl:col-span-2"
            label={copy.detail.monthlyPayment}
            hint={copy.detail.paymentHint}
          >
            <Amount
              money={data.monthlyPayment}
              emphasis="strong"
              className="block text-left text-3xl tracking-tight"
            />
          </StatCard>

          <StatCard icon={CalendarCheck} label={copy.detail.payoffDate}>
            <p className="num block text-left text-2xl tracking-tight">
              {formatIsoDate(data.payoffDate)}
            </p>
          </StatCard>

          <StatCard icon={Wallet} label={copy.detail.principal}>
            <Amount money={data.principal} className="block text-left text-2xl" />
          </StatCard>

          <StatCard icon={Percent} label={copy.detail.rate}>
            <p className="num block text-left text-2xl">{data.annualRate} %</p>
          </StatCard>

          <StatCard
            icon={Landmark}
            label={copy.detail.outstanding}
            hint={copy.detail.outstandingHint}
          >
            <Amount money={data.outstanding} className="block text-left text-2xl" />
          </StatCard>

          <StatCard
            icon={Timer}
            label={copy.detail.term}
            {...(schedule.data
              ? { hint: copy.detail.remaining(cuotasRestantes(schedule.data.installments)) }
              : {})}
          >
            <p className="num block text-left text-2xl">
              {copy.simulator.results.months(data.termMonths)}
            </p>
          </StatCard>

          {/* Un nombre propio no es una cifra: sin `num` ni alineación a la derecha. */}
          <StatCard icon={Building2} label={copy.detail.counterparty}>
            <p className="block truncate text-left text-2xl tracking-tight">{data.counterparty}</p>
          </StatCard>
        </StatGrid>
      </div>

      {/* Solo lo que se debe lleva pagos: lo que te deben va por calendario. */}
      {data.direction === 'BORROWED' && schedule.data ? (
        <PagosDeLaDeuda debt={data} installments={schedule.data.installments} />
      ) : null}

      <section aria-labelledby="tabla" className="space-y-3">
        <h2 id="tabla" className="flex items-center gap-2 text-base font-medium tracking-tight">
          <TableProperties className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          {copy.schedule.title}
        </h2>

        {schedule.isPending ? (
          <Skeleton className="h-64 w-full" />
        ) : schedule.isError ? (
          <ErrorState
            title={copy.error.title}
            description={copy.error.description}
            retryLabel={copy.error.retry}
            onRetry={() => void schedule.refetch()}
          />
        ) : schedule.data ? (
          <>
            <BalanceChart installments={schedule.data.installments} />
            <div className="flex flex-wrap gap-x-8 gap-y-1 border-y border-border py-2">
              <p className="text-sm">
                <span className="text-muted-foreground">{copy.schedule.totalInterest} </span>
                <Amount money={schedule.data.totalInterest} emphasis="strong" />
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">{copy.schedule.totalPaid} </span>
                <Amount money={schedule.data.totalPaid} emphasis="strong" />
              </p>
            </div>
            <AmortizationTable installments={schedule.data.installments} />
            <p className="text-xs text-muted-foreground">{copy.schedule.lastInstallment}</p>
          </>
        ) : null}
      </section>

      <ExtraPaymentSimulator debt={data} />
    </div>
  )
}

export const Route = createFileRoute('/deudas/$debtId/')({
  component: DebtDetail,
})
