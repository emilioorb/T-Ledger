import { loUltimoDe, useAlCargarLoUltimo } from '@/lib/cargar-lo-ultimo'
import { queryKeys } from '@/lib/query-keys'
import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Plus, Receipt } from 'lucide-react'
import { FormDialog } from '@/components/form-dialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { copy } from '@/features/debts/copy'
import { DebtForm } from '@/features/debts/debt-form'
import { DebtList } from '@/features/debts/debt-list'
import type { Debt } from '@/features/debts/types'
import { useCreateDebt, useUpdateDebt } from '@/features/debts/use-debts'
import { toMoneyInput } from '@/lib/money'

// `debt` ausente es un alta; presente, una edición. Un solo estado para las dos cosas
// evita la ventana en que los dos modales podrían estar abiertos.
type Editing = { debt?: Debt }

const DebtsScreen = () => {
  const [editing, setEditing] = useState<Editing | null>(null)
  const createDebt = useCreateDebt()
  const updateDebt = useUpdateDebt()

  const close = () => setEditing(null)

  const newDebtButton = (
    <Button size="sm" onClick={() => setEditing({})}>
      <Plus className="size-4" aria-hidden="true" />
      {copy.form.createTitle}
    </Button>
  )

  // Rearmar el formulario abierto con la versión que guardó la otra persona.
  useAlCargarLoUltimo((cache) =>
    setEditing((actual) => {
      const nueva = actual?.debt && loUltimoDe<Debt>(cache, queryKeys.debts.all, actual.debt.id)
      return nueva ? { ...actual, debt: nueva } : actual
    }),
  )
  const editingDebt = editing?.debt

  return (
    <section className="space-y-5">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-xl font-semibold tracking-tight">{copy.nav.debts}</h1>
        {newDebtButton}
      </div>

      <FormDialog
        icon={Receipt}
        open={editing !== null}
        className="sm:max-w-2xl"
        title={editingDebt ? copy.form.editTitle : copy.form.createTitle}
        onOpenChange={(open) => !open && close()}
      >
        {editing ? (
          <DebtForm
            key={editingDebt ? `${editingDebt.id}-${editingDebt.version}` : 'nueva'}
            pending={createDebt.isPending || updateDebt.isPending}
            submitLabel={editingDebt ? copy.form.submitEdit : undefined}
            onCancel={close}
            defaults={
              editingDebt
                ? {
                    direction: editingDebt.direction,
                    name: editingDebt.name,
                    counterparty: editingDebt.counterparty,
                    principal: toMoneyInput(editingDebt.principal),
                    currency: editingDebt.principal.currency,
                    annualRate: editingDebt.annualRate,
                    compounding: editingDebt.compounding,
                    termMonths: editingDebt.termMonths,
                    startDate: editingDebt.startDate,
                    kind: editingDebt.kind,
                    budgetBucket: editingDebt.budgetBucket ?? '',
                  }
                : undefined
            }
            onSubmit={(input) =>
              editingDebt
                ? // La versión que se vio: si otra persona guardó antes, 409 y el aviso ofrece cargar
                  // lo último.
                  updateDebt.mutate({ id: editingDebt.id, input: { ...input, version: editingDebt.version } }, { onSuccess: close })
                : createDebt.mutate(input, { onSuccess: close })
            }
          />
        ) : null}
      </FormDialog>

      <Tabs defaultValue="BORROWED">
        <TabsList>
          <TabsTrigger value="BORROWED">{copy.tabs.borrowed}</TabsTrigger>
          <TabsTrigger value="LENT">{copy.tabs.lent}</TabsTrigger>
        </TabsList>
        <TabsContent value="BORROWED" className="mt-4">
          <DebtList
            direction="BORROWED"
            emptyAction={newDebtButton}
            onEdit={(debt) => setEditing({ debt })}
          />
        </TabsContent>
        <TabsContent value="LENT" className="mt-4">
          <DebtList
            direction="LENT"
            emptyAction={newDebtButton}
            onEdit={(debt) => setEditing({ debt })}
          />
        </TabsContent>
      </Tabs>
    </section>
  )
}

export const Route = createFileRoute('/deudas/')({
  component: DebtsScreen,
})
