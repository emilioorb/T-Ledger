import { Link, createFileRoute } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { copy } from '@/features/debts/copy'
import { DebtList } from '@/features/debts/debt-list'

const DebtsScreen = () => {
  const newDebtButton = (
    <Button size="sm" asChild>
      <Link to="/deudas/nueva">
        <Plus className="size-4" aria-hidden="true" />
        {copy.form.createTitle}
      </Link>
    </Button>
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
