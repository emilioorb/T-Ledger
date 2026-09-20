import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AmortizationTable } from '@/features/debts/amortization-table'
import { BalanceChart } from '@/features/debts/balance-chart'
import { copy } from '@/features/debts/copy'
import { ErrorState } from '@/features/debts/error-state'
import { ExtraPaymentSimulator } from '@/features/debts/extra-payment-simulator'
import { useDebt, useDeleteDebt, useSchedule } from '@/features/debts/use-debts'
import { formatIsoDate } from '@/lib/dates'
import { formatMoney } from '@/lib/money'

const Fact = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-baseline justify-between gap-4 border-b border-border py-1.5 sm:block sm:border-0 sm:py-0">
    <dt className="text-xs tracking-wide text-muted-foreground uppercase">{label}</dt>
    <dd className="num text-sm sm:mt-0.5 sm:text-left">{value}</dd>
  </div>
)

const DebtDetail = () => {
  const { debtId } = Route.useParams()
  const navigate = useNavigate()
  const debt = useDebt(debtId)
  const schedule = useSchedule(debtId)
  const deleteDebt = useDeleteDebt()

  if (debt.isPending) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (debt.isError || !debt.data) return <ErrorState onRetry={() => void debt.refetch()} />

  const { data } = debt

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Link
          to="/deudas"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          {copy.detail.back}
        </Link>

        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-xl font-semibold tracking-tight">{data.name}</h1>
          <Button
            variant="ghost"
            size="sm"
            disabled={deleteDebt.isPending}
            onClick={() =>
              deleteDebt.mutate(data.id, { onSuccess: () => navigate({ to: '/deudas' }) })
            }
          >
            <Trash2 className="size-4" aria-hidden="true" />
            {copy.detail.delete}
          </Button>
        </div>

        <dl className="grid gap-x-6 sm:grid-cols-3 lg:grid-cols-6">
          <Fact label={copy.detail.counterparty} value={data.counterparty} />
          <Fact label={copy.detail.principal} value={formatMoney(data.principal)} />
          <Fact label={copy.detail.monthlyPayment} value={formatMoney(data.monthlyPayment)} />
          <Fact label={copy.detail.rate} value={`${data.annualRate} %`} />
          <Fact label={copy.detail.term} value={copy.simulator.results.months(data.termMonths)} />
          <Fact label={copy.detail.payoffDate} value={formatIsoDate(data.payoffDate)} />
        </dl>
      </div>

      <section aria-labelledby="tabla" className="space-y-3">
        <h2 id="tabla" className="text-base font-medium tracking-tight">
          {copy.schedule.title}
        </h2>

        {schedule.isPending ? (
          <Skeleton className="h-64 w-full" />
        ) : schedule.isError ? (
          <ErrorState onRetry={() => void schedule.refetch()} />
        ) : schedule.data ? (
          <>
            <BalanceChart installments={schedule.data.installments} />
            <div className="flex flex-wrap gap-x-8 gap-y-1 border-y border-border py-2">
              <p className="text-sm">
                <span className="text-muted-foreground">{copy.schedule.totalInterest} </span>
                <span className="num font-medium">{formatMoney(schedule.data.totalInterest)}</span>
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">{copy.schedule.totalPaid} </span>
                <span className="num font-medium">{formatMoney(schedule.data.totalPaid)}</span>
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

export const Route = createFileRoute('/deudas/$debtId')({
  component: DebtDetail,
})
