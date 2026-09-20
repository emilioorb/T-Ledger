import { Link } from '@tanstack/react-router'
import { Pencil, Trash2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { copy } from './copy'
import type { Debt } from './types'
import { useDeleteDebt } from './use-debts'

// Un diálogo de confirmación sí es el lugar del modal: interrumpe una acción irreversible
// y no hay nada que editar detrás de él.
export const DebtRowActions = ({ debt }: { debt: Debt }) => {
  const deleteDebt = useDeleteDebt()

  return (
    <div className="flex justify-end gap-0.5">
      <Button variant="ghost" size="sm" className="size-8" asChild>
        <Link to="/deudas/$debtId/editar" params={{ debtId: debt.id }} aria-label={copy.list.edit(debt.name)}>
          <Pencil className="size-4" aria-hidden="true" />
        </Link>
      </Button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="sm" className="size-8" aria-label={copy.list.delete(debt.name)}>
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.confirmDelete.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {copy.confirmDelete.description(debt.name)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{copy.confirmDelete.cancel}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => deleteDebt.mutate(debt.id)}>
              {copy.confirmDelete.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
