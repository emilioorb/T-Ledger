import { useState, type FormEvent } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { ArrowRight, Plus } from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { copy } from '@/features/accounting/copy'
import type { Account, Category, CategoryKind } from '@/features/accounting/types'
import {
  useAccounts,
  useCategories,
  useDeleteCategory,
  useSaveCategory,
} from '@/features/accounting/use-accounting'

const NO_ACCOUNT = 'none'

interface FormValues {
  name: string
  kind: CategoryKind
  accountCode: string | null
  active: boolean
  sortOrder: number
}

const emptyValues: FormValues = {
  name: '',
  kind: 'EXPENSE',
  accountCode: null,
  active: true,
  sortOrder: 0,
}

interface FormProps {
  category?: Category
  postable: Account[]
  pending: boolean
  onSubmit: (values: FormValues) => void
  onCancel: () => void
}

const CategoryForm = ({ category, postable, pending, onSubmit, onCancel }: FormProps) => {
  const [values, setValues] = useState<FormValues>(
    category
      ? {
          name: category.name,
          kind: category.kind,
          accountCode: category.accountCode,
          active: category.active,
          sortOrder: category.sortOrder,
        }
      : emptyValues,
  )
  const fields = copy.categories.form

  const submit = (event: FormEvent) => {
    event.preventDefault()
    onSubmit(values)
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-[1fr_9rem_1fr_auto] sm:items-end">
      <div className="space-y-1.5">
        <Label htmlFor="name">{fields.name.label}</Label>
        <Input
          id="name"
          value={values.name}
          required
          onChange={(event) => setValues({ ...values, name: event.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="kind">{fields.kind.label}</Label>
        <Select
          value={values.kind}
          onValueChange={(next) => setValues({ ...values, kind: next as CategoryKind })}
        >
          <SelectTrigger id="kind" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="EXPENSE">{fields.kind.expense}</SelectItem>
            <SelectItem value="INCOME">{fields.kind.income}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="accountCode">{fields.accountCode.label}</Label>
        <Select
          value={values.accountCode ?? NO_ACCOUNT}
          onValueChange={(next) =>
            setValues({ ...values, accountCode: next === NO_ACCOUNT ? null : next })
          }
        >
          <SelectTrigger id="accountCode" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_ACCOUNT}>{fields.noAccount}</SelectItem>
            {postable.map((account) => (
              <SelectItem key={account.code} value={account.code}>
                {account.code} · {account.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {copy.common.save}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          {copy.common.cancel}
        </Button>
      </div>
    </form>
  )
}

interface RowProps {
  category: Category
  accountName?: string
  onEdit: () => void
  onDelete: () => void
}

// Una categoría es un mapeo, no una fila de tabla: se lee «nombre → cuenta» de un vistazo.
const CategoryRow = ({ category, accountName, onEdit, onDelete }: RowProps) => (
  <li className="group flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border py-2.5">
    <span className="min-w-0 flex-1 truncate text-sm">{category.name}</span>
    <span className="w-16 shrink-0 text-xs text-muted-foreground">
      {copy.categories.kinds[category.kind]}
    </span>

    <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />

    {category.accountCode ? (
      <span className="w-56 shrink-0 truncate text-sm">
        <span className="num text-xs text-muted-foreground">{category.accountCode}</span>{' '}
        {accountName}
      </span>
    ) : (
      <span className="w-56 shrink-0 text-sm text-warning">{copy.categories.unmapped}</span>
    )}

    {/* Siempre visibles, no en hover: en el teléfono no hay hover, y una acción que solo
        aparece al pasar el puntero no existe para la mitad de los usos. */}
    <span className="flex shrink-0 gap-1">
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
        onClick={onEdit}
      >
        {copy.categories.form.editTitle}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
        onClick={onDelete}
      >
        {copy.categories.confirmDelete.confirm}
      </Button>
    </span>
  </li>
)

const CategoriesScreen = () => {
  const [editing, setEditing] = useState<{ category?: Category } | null>(null)
  const [deleting, setDeleting] = useState<Category | null>(null)

  const categories = useCategories()
  const accounts = useAccounts()
  const save = useSaveCategory()
  const remove = useDeleteCategory()

  const all = accounts.data?.data ?? []
  const parents = new Set(all.map((account) => account.parentCode).filter(Boolean))
  // Solo hojas activas aceptan asientos: ofrecer una agrupadora sería ofrecer un error.
  const postable = all.filter((account) => account.active && !parents.has(account.code))
  const nameOf = new Map(all.map((account) => [account.code, account.name]))

  const list = categories.data ?? []
  const unmapped = list.filter((category) => category.accountCode === null)
  const mapped = list.filter((category) => category.accountCode !== null)

  const submit = (values: FormValues) => {
    save.mutate(
      editing?.category ? { id: editing.category.id, input: values } : { input: values },
      { onSuccess: () => setEditing(null) },
    )
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-[60ch]">
          <h1 className="text-xl font-semibold tracking-tight">{copy.categories.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{copy.categories.description}</p>
        </div>
        <Button size="sm" onClick={() => setEditing({})}>
          <Plus className="size-4" aria-hidden="true" />
          {copy.categories.new}
        </Button>
      </header>

      {editing ? (
        <div className="border-y border-border py-5">
          <h2 className="mb-4 text-base font-medium tracking-tight">
            {editing.category ? copy.categories.form.editTitle : copy.categories.form.createTitle}
          </h2>
          <CategoryForm
            category={editing.category}
            postable={postable}
            pending={save.isPending}
            onSubmit={submit}
            onCancel={() => setEditing(null)}
          />
        </div>
      ) : null}

      {categories.isPending ? (
        <div className="space-y-2" aria-label={copy.common.loading}>
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-9 w-full" />
          ))}
        </div>
      ) : categories.isError ? (
        <ErrorState
          title={copy.common.error.title}
          description={copy.common.error.description}
          retryLabel={copy.common.retry}
          onRetry={() => void categories.refetch()}
        />
      ) : list.length === 0 ? (
        <EmptyState
          title={copy.categories.empty.title}
          description={copy.categories.empty.description}
          action={
            <Button size="sm" onClick={() => setEditing({})}>
              {copy.categories.empty.action}
            </Button>
          }
        />
      ) : (
        <div className="space-y-8">
          {/* Las sin cuenta van primero y con su consecuencia escrita: es información,
              no un error, y por eso no se pinta de rojo. */}
          {unmapped.length > 0 ? (
            <div>
              <h2 className="text-sm font-medium tracking-tight">{copy.categories.unmapped}</h2>
              <p className="mt-0.5 max-w-[65ch] text-xs text-muted-foreground">
                {copy.categories.unmappedHint}
              </p>
              <ul className="mt-3">
                {unmapped.map((category) => (
                  <CategoryRow
                    key={category.id}
                    category={category}
                    onEdit={() => setEditing({ category })}
                    onDelete={() => setDeleting(category)}
                  />
                ))}
              </ul>
            </div>
          ) : null}

          {mapped.length > 0 ? (
            <ul>
              {mapped.map((category) => (
                <CategoryRow
                  key={category.id}
                  category={category}
                  accountName={nameOf.get(category.accountCode ?? '')}
                  onEdit={() => setEditing({ category })}
                  onDelete={() => setDeleting(category)}
                />
              ))}
            </ul>
          ) : null}
        </div>
      )}

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.categories.confirmDelete.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {copy.categories.confirmDelete.description(deleting?.name ?? '')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{copy.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleting) remove.mutate(deleting.id)
                setDeleting(null)
              }}
            >
              {copy.categories.confirmDelete.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}

export const Route = createFileRoute('/contabilidad/categorias')({ component: CategoriesScreen })
