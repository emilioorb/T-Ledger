import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Plus, Receipt } from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
import { SearchInput } from '@/components/search-input'
import { FormDialog } from '@/components/form-dialog'
import { Pager } from '@/components/pager'
import { TableFrame } from '@/components/table-frame'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Hint } from '@/components/hint'
import { Amount } from '@/features/accounting/amount'
import { usePrimaryAction } from '@/features/shortcuts/primary-action'
import { copy } from '@/features/accounting/copy'
import { MovementForm, type MovementFormValues } from '@/features/accounting/movement-form'
import { ControlBar, RangeFields } from '@/features/accounting/report-controls'
import type { Category, Movement, MovementFilters } from '@/features/accounting/types'
import {
  useCategories,
  usePostableAssets,
  PAGE_SIZE,
  useMovements,
  useSaveMovement,
  useVoidMovement,
} from '@/features/accounting/use-accounting'
import { formatIsoDate, monthEnd, monthStart, today } from '@/lib/dates'
import { useDebounced } from '@/lib/use-debounced'
import { usePage } from '@/lib/use-page'
import { cn } from '@/lib/utils'
import { TEXT_LINK } from '@/components/text-link'
import { TableSkeleton } from '@/components/table-skeleton'

const ALL = 'all'

interface RowProps {
  movement: Movement
  category?: Category
  onEdit: () => void
  onVoid: () => void
}

// Las marcas que no son un dato de columna: anulado, sin contabilizar, y el enlace al
// asiento. Van juntas porque las tres responden lo mismo: en qué estado quedó esto.
const Marks = ({ movement }: { movement: Movement }) => {
  const isVoided = movement.status === 'VOIDED'

  return (
    <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs">
      {isVoided ? (
        <span className="text-muted-foreground">{copy.movements.statuses.VOIDED}</span>
      ) : null}

      {!movement.posted && !isVoided ? (
        <Hint text={copy.movements.unpostedHint}>
          <Link to="/contabilidad/categorias" className="text-warning">
            {copy.movements.unposted}
          </Link>
        </Hint>
      ) : null}

      {movement.journalEntryId ? (
        <Link
          to="/contabilidad/asientos"
          search={{ entry: movement.journalEntryId }}
          className={TEXT_LINK}
        >
          {copy.movements.viewEntry}
        </Link>
      ) : null}
    </span>
  )
}

const Actions = ({ movement, onEdit, onVoid }: Omit<RowProps, 'category'>) =>
  movement.status === 'VOIDED' ? null : (
    <span className="flex justify-end gap-1">
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
  )

const MovementTableRow = ({ movement, category, onEdit, onVoid }: RowProps) => {
  const struck = movement.status === 'VOIDED' && 'text-muted-foreground line-through'

  return (
    <TableRow>
      <TableCell className="num whitespace-nowrap">{formatIsoDate(movement.date)}</TableCell>
      <TableCell className={cn('max-w-0 truncate', struck)}>{movement.counterparty}</TableCell>
      <TableCell className="text-muted-foreground">{category?.name ?? '—'}</TableCell>
      <TableCell>
        <Marks movement={movement} />
      </TableCell>
      <TableCell className={cn('num num-right whitespace-nowrap', struck)}>
        <Amount
          money={movement.amount}
          emphasis={movement.kind === 'INCOME' ? 'strong' : 'normal'}
        />
      </TableCell>
      <TableCell>
        <Actions movement={movement} onEdit={onEdit} onVoid={onVoid} />
      </TableCell>
    </TableRow>
  )
}

// Bajo 768 px una tabla de seis columnas obliga a desplazar de lado para leer un monto.
// Ahí cada movimiento es un bloque, que es como se lee en el teléfono.
const MovementCard = ({ movement, category, onEdit, onVoid }: RowProps) => {
  const struck = movement.status === 'VOIDED' && 'text-muted-foreground line-through'

  return (
    <li className="px-3 py-2.5">
      <div className="flex items-baseline gap-3">
        <span className={cn('min-w-0 flex-1 truncate text-sm', struck)}>
          {movement.counterparty}
        </span>
        <Amount
          money={movement.amount}
          className={cn('shrink-0 text-sm', struck)}
          emphasis={movement.kind === 'INCOME' ? 'strong' : 'normal'}
        />
      </div>

      <div className="mt-0.5 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs">
        <span className="num text-muted-foreground">{formatIsoDate(movement.date)}</span>
        <span className="text-muted-foreground">{category?.name ?? '—'}</span>
        <Marks movement={movement} />
        <span className="ml-auto">
          <Actions movement={movement} onEdit={onEdit} onVoid={onVoid} />
        </span>
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
  const [search, setSearch] = useState('')
  const settledSearch = useDebounced(search.trim())
  const [editing, setEditing] = useState<{ movement?: Movement } | null>(null)
  const [voiding, setVoiding] = useState<Movement | null>(null)

  const filters: MovementFilters = {
    from,
    to,
    ...(kind === ALL ? {} : { kind: kind as MovementFilters['kind'] }),
    ...(status === ALL ? {} : { status: status as MovementFilters['status'] }),
    ...(categoryId === ALL ? {} : { categoryId }),
    ...(settledSearch === '' ? {} : { search: settledSearch }),
  }

  usePrimaryAction(copy.movements.new, () => setEditing({}))

  const [page, setPage] = usePage(JSON.stringify(filters))
  const movements = useMovements(filters, page)
  const categories = useCategories()
  const paymentAccounts = usePostableAssets()
  const save = useSaveMovement()
  const voidMovement = useVoidMovement()

  const byId = new Map((categories.data ?? []).map((category) => [category.id, category]))

  const items = movements.data?.data ?? []
  const hasFilters = kind !== ALL || status !== ALL || categoryId !== ALL || settledSearch !== ''

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

      <FormDialog
        icon={Receipt}
        open={editing !== null}
        className="sm:max-w-2xl"
        title={editing?.movement ? copy.movements.form.editTitle : copy.movements.form.createTitle}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        {editing ? (
          <MovementForm
            key={editing.movement?.id ?? 'nuevo'}
            movement={editing.movement}
            categories={categories.data ?? []}
            paymentAccounts={paymentAccounts}
            pending={save.isPending}
            onSubmit={submit}
            onCancel={() => setEditing(null)}
          />
        ) : null}
      </FormDialog>

      <ControlBar>
        <RangeFields from={from} to={to} onFrom={setFrom} onTo={setTo} />

        <div className="flex flex-col gap-1">
          <Label htmlFor="kind-filter" className="text-xs font-normal text-muted-foreground">
            {copy.movements.filters.kind.label}
          </Label>
          <Select value={kind} onValueChange={setKind}>
            <SelectTrigger id="kind-filter" className="h-8 w-40">
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
            <SelectTrigger id="status-filter" className="h-8 w-32">
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
            <SelectTrigger id="category-filter" className="h-8 w-44">
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

        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={copy.movements.search.placeholder}
          label={copy.movements.search.label}
        />
      </ControlBar>

      {movements.isPending ? (
        <TableSkeleton rows={6} label={copy.common.loading} />
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
                  setSearch('')
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
        <div className="space-y-4">
          <TableFrame className="hidden @3xl:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{copy.movements.columns.date}</TableHead>
                  <TableHead className="w-full">{copy.movements.columns.counterparty}</TableHead>
                  <TableHead>{copy.movements.columns.category}</TableHead>
                  <TableHead>{copy.movements.columns.status}</TableHead>
                  <TableHead className="text-right">{copy.movements.columns.amount}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((movement) => (
                  <MovementTableRow
                    key={movement.id}
                    movement={movement}
                    category={byId.get(movement.categoryId)}
                    onEdit={() => setEditing({ movement })}
                    onVoid={() => setVoiding(movement)}
                  />
                ))}
              </TableBody>
            </Table>
          </TableFrame>

          <TableFrame className="@3xl:hidden">
            <ul className="divide-y divide-border">
              {items.map((movement) => (
                <MovementCard
                  key={movement.id}
                  movement={movement}
                  category={byId.get(movement.categoryId)}
                  onEdit={() => setEditing({ movement })}
                  onVoid={() => setVoiding(movement)}
                />
              ))}
            </ul>
          </TableFrame>

          <Pager
            page={page}
            pageSize={PAGE_SIZE}
            totalItems={movements.data.pagination.totalItems}
            labels={copy.common.pager}
            onPage={setPage}
          />
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
