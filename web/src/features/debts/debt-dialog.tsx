import { useState, type ReactNode } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toMoneyInput } from '@/lib/money'
import { copy } from './copy'
import { DebtForm } from './debt-form'
import type { Debt } from './types'
import { useCreateDebt, useUpdateDebt } from './use-debts'

const CreateBody = ({ onDone }: { onDone: () => void }) => {
  const createDebt = useCreateDebt()
  return (
    <DebtForm
      pending={createDebt.isPending}
      onCancel={onDone}
      onSubmit={(input) => createDebt.mutate(input, { onSuccess: onDone })}
    />
  )
}

const EditBody = ({ debt, onDone }: { debt: Debt; onDone: () => void }) => {
  const updateDebt = useUpdateDebt(debt.id)
  return (
    <DebtForm
      pending={updateDebt.isPending}
      onCancel={onDone}
      submitLabel={copy.form.submitEdit}
      defaults={{
        direction: debt.direction,
        name: debt.name,
        counterparty: debt.counterparty,
        principal: toMoneyInput(debt.principal),
        currency: debt.principal.currency,
        annualRate: debt.annualRate,
        compounding: debt.compounding,
        termMonths: debt.termMonths,
        startDate: debt.startDate,
        kind: debt.kind,
        budgetBucket: debt.budgetBucket ?? '',
      }}
      onSubmit={(input) => updateDebt.mutate(input, { onSuccess: onDone })}
    />
  )
}

interface Props {
  trigger: ReactNode
  debt?: Debt
}

export const DebtDialog = ({ trigger, debt }: Props) => {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{debt ? copy.form.editTitle : copy.form.createTitle}</DialogTitle>
          <DialogDescription>
            {debt ? debt.counterparty : copy.empty.borrowed.description}
          </DialogDescription>
        </DialogHeader>
        {/* El formulario se monta recién al abrir, así los valores por defecto de una
            edición se toman de la deuda tal como está en ese momento. */}
        {open ? (
          debt ? (
            <EditBody debt={debt} onDone={close} />
          ) : (
            <CreateBody onDone={close} />
          )
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
