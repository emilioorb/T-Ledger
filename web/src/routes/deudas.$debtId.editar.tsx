import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Skeleton } from '@/components/ui/skeleton'
import { copy } from '@/features/debts/copy'
import { DebtForm } from '@/features/debts/debt-form'
import { ErrorState } from '@/features/debts/error-state'
import { useDebt, useUpdateDebt } from '@/features/debts/use-debts'
import { toMoneyInput } from '@/lib/money'

const EditDebtScreen = () => {
  const { debtId } = Route.useParams()
  const navigate = useNavigate()
  const debt = useDebt(debtId)
  const updateDebt = useUpdateDebt(debtId)

  const back = () => void navigate({ to: '/deudas/$debtId', params: { debtId } })

  if (debt.isPending) {
    return (
      <div className="max-w-3xl space-y-4" aria-busy="true">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (debt.isError || !debt.data) return <ErrorState onRetry={() => void debt.refetch()} />

  const { data } = debt

  return (
    <section className="max-w-3xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{copy.form.editTitle}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{data.name}</p>
      </div>

      <DebtForm
        pending={updateDebt.isPending}
        submitLabel={copy.form.submitEdit}
        onCancel={back}
        defaults={{
          direction: data.direction,
          name: data.name,
          counterparty: data.counterparty,
          principal: toMoneyInput(data.principal),
          currency: data.principal.currency,
          annualRate: data.annualRate,
          compounding: data.compounding,
          termMonths: data.termMonths,
          startDate: data.startDate,
          kind: data.kind,
          budgetBucket: data.budgetBucket ?? '',
        }}
        onSubmit={(input) => updateDebt.mutate(input, { onSuccess: back })}
      />
    </section>
  )
}

export const Route = createFileRoute('/deudas/$debtId/editar')({
  component: EditDebtScreen,
})
