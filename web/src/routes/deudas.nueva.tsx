import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { copy } from '@/features/debts/copy'
import { DebtForm } from '@/features/debts/debt-form'
import { useCreateDebt } from '@/features/debts/use-debts'

const NewDebtScreen = () => {
  const navigate = useNavigate()
  const createDebt = useCreateDebt()

  return (
    <section className="max-w-3xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{copy.form.createTitle}</h1>
        <p className="mt-0.5 max-w-[65ch] text-sm text-muted-foreground">
          {copy.empty.borrowed.description}
        </p>
      </div>

      <DebtForm
        pending={createDebt.isPending}
        onCancel={() => void navigate({ to: '/deudas' })}
        onSubmit={(input) =>
          createDebt.mutate(input, {
            onSuccess: (debt) => void navigate({ to: '/deudas/$debtId', params: { debtId: debt.id } }),
          })
        }
      />
    </section>
  )
}

export const Route = createFileRoute('/deudas/nueva')({
  component: NewDebtScreen,
})
