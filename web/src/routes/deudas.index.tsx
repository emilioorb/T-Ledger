import { createFileRoute } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { copy } from '@/features/debts/copy'
import { DebtForm } from '@/features/debts/debt-form'
import { DebtList } from '@/features/debts/debt-list'
import { useCreateDebt } from '@/features/debts/use-debts'

const DebtsScreen = () => {
  const [open, setOpen] = useState(false)
  const createDebt = useCreateDebt()

  const newDebtButton = (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" aria-hidden="true" />
          {copy.form.createTitle}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{copy.form.createTitle}</DialogTitle>
          <DialogDescription>{copy.empty.borrowed.description}</DialogDescription>
        </DialogHeader>
        <DebtForm
          pending={createDebt.isPending}
          onCancel={() => setOpen(false)}
          onSubmit={(input) =>
            createDebt.mutate(input, { onSuccess: () => setOpen(false) })
          }
        />
      </DialogContent>
    </Dialog>
  )

  return (
    <section className="space-y-5">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-xl font-semibold tracking-tight">{copy.nav.debts}</h1>
        {newDebtButton}
      </div>

      <Tabs defaultValue="BORROWED">
        <TabsList>
          <TabsTrigger value="BORROWED">{copy.tabs.borrowed}</TabsTrigger>
          <TabsTrigger value="LENT">{copy.tabs.lent}</TabsTrigger>
        </TabsList>
        <TabsContent value="BORROWED" className="mt-4">
          <DebtList direction="BORROWED" emptyAction={newDebtButton} />
        </TabsContent>
        <TabsContent value="LENT" className="mt-4">
          <DebtList direction="LENT" emptyAction={newDebtButton} />
        </TabsContent>
      </Tabs>
    </section>
  )
}

export const Route = createFileRoute('/deudas/')({
  component: DebtsScreen,
})
