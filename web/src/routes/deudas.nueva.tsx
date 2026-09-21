import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Receipt } from 'lucide-react'
import { copy } from '@/features/debts/copy'
import { DebtForm } from '@/features/debts/debt-form'
import { useCreateDebt } from '@/features/debts/use-debts'

const NewDebtScreen = () => {
  const navigate = useNavigate()
  const createDebt = useCreateDebt()

  return (
    <section className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
          <Receipt className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          {copy.form.createTitle}
        </h1>
        <p className="mt-0.5 max-w-[65ch] text-sm text-muted-foreground">
          {copy.empty.borrowed.description}
        </p>
      </div>

      <DebtForm
        pending={createDebt.isPending}
        onCancel={() => void navigate({ to: '/deudas' })}
        onSubmit={(input) =>
          createDebt.mutate(input, {
            onSuccess: (debt) =>
              void navigate({ to: '/deudas/$debtId', params: { debtId: debt.id } }),
          })
        }
      />
    </section>
  )
}

export const Route = createFileRoute('/deudas/nueva')({
  component: NewDebtScreen,
})
