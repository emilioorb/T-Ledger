import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Amount } from '@/features/accounting/amount'
import { copy } from '@/features/accounting/copy'
import { MovementForm, type MovementFormValues } from '@/features/accounting/movement-form'
import { ControlBar, DateField } from '@/features/accounting/report-controls'
import type { Category, Movement, MovementFilters } from '@/features/accounting/types'
import {
  useAccounts,
  useCategories,
  useMovements,
  useSaveMovement,
  useVoidMovement,
} from '@/features/accounting/use-accounting'
import { formatIsoDate, monthEnd, monthStart, today } from '@/lib/dates'
import { cn } from '@/lib/utils'

const ALL = 'all'

const groupByDate = (movements: Movement[]): [string, Movement[]][] => {
  const groups = new Map<string, Movement[]>()
  for (const movement of movements) {
    groups.set(movement.date, [...(groups.get(movement.date) ?? []), movement])
  }
  return [...groups.entries()].sort(([a], [b]) => b.localeCompare(a))
}

interface RowProps {
  movement: Movement
  category?: Category
  onEdit: () => void
  onVoid: () => void
}

// Dos renglones en el teléfono y uno solo en escritorio: en 360 px, cinco elementos
// peleando por el ancho dejan el nombre en dos glifos, y anotar en el teléfono es el
// camino que más se recorre.
const MovementRow = ({ movement, category, onEdit, onVoid }: RowProps) => {
  const isVoided = movement.status === 'VOIDED'
  const struck = isVoided && 'text-muted-foreground line-through'

  return (
    <li className="border-b border-border py-2.5">
      <div className="flex items-baseline gap-3">
        <span className={cn('min-w-0 flex-1 truncate text-sm', struck)}>
          {movement.counterparty}
        </span>
        <Amount
          money={movement.amount}
          className={cn('shrink-0 text-sm', struck)}
          // Un ingreso y un gasto del mismo monto se ven igual sin esta marca.
          emphasis={movement.kind === 'INCOME' ? 'strong' : 'normal'}
        />
      </div>

      <div className="mt-0.5 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs">
        <span className="text-muted-foreground">
          {copy.movements.kinds[movement.kind]} · {category?.name ?? '—'}
        </span>

        {isVoided ? (
          <span className="text-muted-foreground">{copy.movements.statuses.VOIDED}</span>
        ) : null}

        {!movement.posted && !isVoided ? (
          <Link
            to="/contabilidad/categorias"
            className="text-warning underline underline-offset-2"
            title={copy.movements.unpostedHint}
          >
            {copy.movements.unposted}
          </Link>
        ) : null}

        {movement.journalEntryId ? (
          <Link
            to="/contabilidad/asientos"
            search={{ entry: movement.journalEntryId }}
            className="text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            {copy.movements.viewEntry}
          </Link>
        ) : null}

        {!isVoided ? (
          <span className="ml-auto flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              aria-label={copy.movements.edit(movement.counterparty)}
              onClick={onEdit}
            >
              {copy.movements.editShort}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              aria-label={copy.movements.void(movement.counterparty)}
              onClick={onVoid}
            >
              {copy.movements.voidShort}
            </Button>
          </span>
        ) : null}
      </div>
    </li>
  )
}

const MovementsScreen = () => {
  const [from, setFrom] = useState(monthStart(today()))
  const [to, setTo] = useState(monthEnd(today()))
  const [kind, setKind] = useState<string>(ALL)
  const [status, setStatus] = useState<string>(ALL)
  const [categoryId, setCategoryId] = useState<string>(ALL)
  const [editing, setEditing] = useState<{ movement?: Movement } | null>(null)
  const [voiding, setVoiding] = useState<Movement | null>(null)

  const filters: MovementFilters = {
    from,
    to,
    ...(kind === ALL ? {} : { kind: kind as MovementFilters['kind'] }),
    ...(status === ALL ? {} : { status: status as MovementFilters['status'] }),
    ...(categoryId === ALL ? {} : { categoryId }),
  }

  const movements = useMovements(filters)
  const categories = useCategories()
  const accounts = useAccounts()
  const save = useSaveMovement()
  const voidMovement = useVoidMovement()

  const all = accounts.data?.data ?? []
  const parents = new Set(all.map((account) => account.parentCode).filter(Boolean))
  const paymentAccounts = all.filter(
    (account) => account.accountClass === 'ASSET' && account.active && !parents.has(account.code),
  )
  const byId = new Map((categories.data ?? []).map((category) => [category.id, category]))
  const items = movements.data?.data ?? []
  const hasFilters = kind !== ALL || status !== ALL || categoryId !== ALL

  const submit = (values: MovementFormValues) =>
    save.mutate(
      editing?.movement ? { id: editing.movement.id, input: values } : { input: values },
      { onSuccess: () => setEditing(null) },
    )

  const newButton = (
    <Button size="sm" onClick={() => setEditing({})}>
      <Plus className="size-4" aria-hidden="true" />
      {copy.movements.new}
    </Button>
  )

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-[60ch]">
          <h1 className="text-xl font-semibold tracking-tight">{copy.movements.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{copy.movements.description}</p>
        </div>
        {newButton}
      </header>

      {editing ? (
        <div className="border-y border-border py-5">
          <h2 className="mb-4 text-base font-medium tracking-tight">
            {editing.movement ? copy.movements.form.editTitle : copy.movements.form.createTitle}
          </h2>
          <MovementForm
            movement={editing.movement}
            categories={categories.data ?? []}
            paymentAccounts={paymentAccounts}
            pending={save.isPending}
            onSubmit={submit}
            onCancel={() => setEditing(null)}
          />
        </div>
      ) : null}

      <ControlBar>
        <DateField id="from" label={copy.common.from} value={from} onChange={setFrom} />
        <DateField id="to" label={copy.common.to} value={to} onChange={setTo} />

        <div className="flex flex-col gap-1">
          <Label htmlFor="kind-filter" className="text-xs font-normal text-muted-foreground">
            {copy.movements.filters.kind.label}
          </Label>
          <Select value={kind} onValueChange={setKind}>
            <SelectTrigger id="kind-filter" size="sm" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{copy.movements.filters.kind.all}</SelectItem>
              <SelectItem value="EXPENSE">{copy.movements.kinds.EXPENSE}</SelectItem>
              <SelectItem value="INCOME">{copy.movements.kinds.INCOME}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="status-filter" className="text-xs font-normal text-muted-foreground">
            {copy.movements.filters.status.label}
          </Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger id="status-filter" size="sm" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{copy.movements.filters.status.all}</SelectItem>
              <SelectItem value="ACTIVE">{copy.movements.filters.status.active}</SelectItem>
              <SelectItem value="VOIDED">{copy.movements.filters.status.voided}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="category-filter" className="text-xs font-normal text-muted-foreground">
            {copy.movements.filters.category.label}
          </Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger id="category-filter" size="sm" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{copy.movements.filters.category.all}</SelectItem>
              {(categories.data ?? []).map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </ControlBar>

      {movements.isPending ? (
        <div className="space-y-2" role="status" aria-label={copy.common.loading}>
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-9 w-full" />
          ))}
        </div>
      ) : movements.isError ? (
        <ErrorState
          title={copy.common.error.title}
          description={copy.common.error.description}
          retryLabel={copy.common.retry}
          onRetry={() => void movements.refetch()}
        />
      ) : items.length === 0 ? (
        hasFilters ? (
          <EmptyState
            title={copy.movements.noMatches.title}
            description={copy.movements.noMatches.description}
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setKind(ALL)
                  setStatus(ALL)
                  setCategoryId(ALL)
                }}
              >
                {copy.movements.noMatches.action}
              </Button>
            }
          />
        ) : (
          <EmptyState
            title={copy.movements.empty.title}
            description={copy.movements.empty.description}
            action={newButton}
          />
        )
      ) : (
        <div className="space-y-6">
          {groupByDate(items).map(([date, ofDay]) => (
            <div key={date}>
              <h2 className="num text-left text-xs font-medium text-muted-foreground">
                {formatIsoDate(date)}
              </h2>
              <ul className="mt-1.5">
                {ofDay.map((movement) => (
                  <MovementRow
                    key={movement.id}
                    movement={movement}
                    category={byId.get(movement.categoryId)}
                    onEdit={() => setEditing({ movement })}
                    onVoid={() => setVoiding(movement)}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={voiding !== null} onOpenChange={(open) => !open && setVoiding(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.movements.confirmVoid.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {copy.movements.confirmVoid.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{copy.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (voiding) voidMovement.mutate(voiding.id)
                setVoiding(null)
              }}
            >
              {copy.movements.confirmVoid.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}

export const Route = createFileRoute('/contabilidad/movimientos')({ component: MovementsScreen })
