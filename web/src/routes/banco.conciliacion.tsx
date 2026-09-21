import { useEffect, useState } from 'react'
import { Banknote, BookOpen, CircleCheck, ListTodo, Scale } from 'lucide-react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { EmptyState } from '@/components/empty-state'
import { Hint } from '@/components/hint'
import { Pager } from '@/components/pager'
import { FRAME_ROW, FrameHeader, TableFrame } from '@/components/table-frame'
import { ErrorState } from '@/components/error-state'
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
import { Amount, isZeroMoney } from '@/features/accounting/amount'
import { ControlBar, RangeFields } from '@/features/accounting/report-controls'
import { useCategories, useMovements } from '@/features/accounting/use-accounting'
import { StatCard, StatGrid } from '@/features/accounting/stat-card'
import { copy } from '@/features/banking/copy'
import type { BankLine, MatchSuggestion } from '@/features/banking/types'
import {
  useBankAccounts,
  useIgnoreLine,
  useLineToMovement,
  PAGE_SIZE,
  useMatchLine,
  useReconciliation,
  useUnmatchLine,
} from '@/features/banking/use-banking'
import { formatIsoDate, monthEnd, monthStart, today } from '@/lib/dates'
import { usePage } from '@/lib/use-page'
import { absMoney, formatMoney } from '@/lib/money'
import { cn } from '@/lib/utils'
import { TableSkeleton } from '@/components/table-skeleton'

interface PairProps {
  line: BankLine
  suggestions: MatchSuggestion[]
  movementLabel: (movementId: string) => string
  categories: { id: string; name: string }[]
  onMatch: (movementId: string) => void
  onIgnore: () => void
  onCreate: (categoryId: string) => void
}

// Encabezado y filas comparten la plantilla: lo que trajo el banco a la izquierda y qué
// hacer con eso a la derecha. La explicación de por qué no hay movimiento vive arriba de
// la lista, no repetida en cada fila.
// La descripción va en `minmax(0,…)` para que ceda: con `1fr` a secas se comprimía hasta
// los 23 px mientras la pista de 22rem de acciones no cedía nada. El monto queda fijo
// porque no se parte, y la fila mira el ancho del contenedor, no el de la ventana.
const COLS = '@4xl:grid-cols-[6.5rem_minmax(0,1fr)_9rem_minmax(0,22rem)] @4xl:items-baseline'

const Pair = ({
  line,
  suggestions,
  movementLabel,
  categories,
  onMatch,
  onIgnore,
  onCreate,
}: PairProps) => {
  const [categoryId, setCategoryId] = useState('')
  const ambiguous = suggestions.length > 1

  return (
    <li className={cn('grid gap-x-4 gap-y-2 px-3 py-3 text-sm', COLS)}>
      <span className="num text-xs text-muted-foreground">{formatIsoDate(line.date)}</span>

      <span className="min-w-0">
        <span className="block truncate">{line.description}</span>
        {line.reference ? (
          <span className="num block text-xs text-muted-foreground">{line.reference}</span>
        ) : null}
      </span>

      <Amount money={line.amount} emphasis="strong" className="@4xl:text-right" />

      <div className="min-w-0">
        {suggestions.length > 0 ? (
          <>
            {ambiguous ? (
              <p className="mb-1.5 text-xs text-warning">{copy.reconciliation.ambiguous}</p>
            ) : null}

            <ul className="space-y-1.5">
              {suggestions.map((suggestion) => (
                <li
                  key={suggestion.movementId}
                  className="flex flex-wrap items-baseline justify-between gap-2"
                >
                  <span className="min-w-0 flex-1">
                    <span className="truncate">{movementLabel(suggestion.movementId)}</span>
                    <span className="block text-xs text-muted-foreground">
                      {copy.reconciliation.reasons[suggestion.reason]}
                    </span>
                  </span>
                  <Button
                    size="sm"
                    className="h-7 px-2 text-xs"
                    aria-label={copy.reconciliation.confirmOf(line.description)}
                    onClick={() => onMatch(suggestion.movementId)}
                  >
                    {copy.reconciliation.confirm}
                  </Button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger
                size="sm"
                className="w-44"
                aria-label={copy.reconciliation.categoryOf(line.description)}
              >
                <SelectValue placeholder={copy.reconciliation.category.label} />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              className="h-7 px-2 text-xs"
              disabled={categoryId === ''}
              aria-label={copy.reconciliation.toMovementOf(line.description)}
              onClick={() => onCreate(categoryId)}
            >
              {copy.reconciliation.toMovement}
            </Button>
          </div>
        )}

        {/* La explicación de «Ignorar» es la misma en todas las filas: repetirla debajo de cada
            una sería ruido. Vive en el tooltip, que el toque y el teclado sí alcanzan. */}
        <Hint text={copy.reconciliation.ignoreHint}>
          <Button
            variant="ghost"
            size="sm"
            className="mt-1 -ml-2 h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
            aria-label={copy.reconciliation.ignoreOf(line.description)}
            onClick={onIgnore}
          >
            {copy.reconciliation.ignore}
          </Button>
        </Hint>
      </div>
    </li>
  )
}

interface ResolvedProps {
  line: BankLine
  onUndo: () => void
}

const ResolvedLine = ({ line, onUndo }: ResolvedProps) => (
  <li className={`flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 ${FRAME_ROW}`}>
    <span className="flex min-w-0 items-baseline gap-2">
      <span className="min-w-0 truncate text-sm text-muted-foreground">{line.description}</span>
      <span className="shrink-0 text-xs text-muted-foreground">
        {line.status === 'MATCHED'
          ? copy.reconciliation.resolved.matched
          : copy.reconciliation.resolved.ignored}
      </span>
    </span>
    <span className="flex items-baseline gap-4">
      <Amount money={line.amount} className="text-sm text-muted-foreground" />
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
        aria-label={copy.reconciliation.unmatchOf(line.description)}
        onClick={onUndo}
      >
        {copy.reconciliation.unmatch}
      </Button>
    </span>
  </li>
)

// El máximo que la API acepta por página: los candidatos de un rango caben de sobra.
const CANDIDATES = 100

const ReconciliationScreen = () => {
  const [bankAccountId, setBankAccountId] = useState('')
  const [from, setFrom] = useState(monthStart(today()))
  const [to, setTo] = useState(monthEnd(today()))

  const accounts = useBankAccounts()
  const [page, setPage] = usePage(`${bankAccountId}|${from}|${to}`)
  const reconciliation = useReconciliation(bankAccountId, from, to, page)
  const categories = useCategories()
  const movements = useMovements({ from, to, status: 'ACTIVE' }, 1, CANDIDATES)
  const match = useMatchLine()
  const unmatch = useUnmatchLine()
  const ignore = useIgnoreLine()
  const toMovement = useLineToMovement()

  // Con una sola cuenta no hay nada que elegir: preguntarlo es trabajo sin decisión.
  const only = accounts.data?.length === 1 ? accounts.data[0]?.id : undefined
  useEffect(() => {
    if (only && bankAccountId === '') setBankAccountId(only)
  }, [only, bankAccountId])

  const movementById = new Map(
    (movements.data?.data ?? []).map((movement) => [
      movement.id,
      `${movement.counterparty} · ${formatMoney(movement.amount)}`,
    ]),
  )
  const categoryOptions = (categories.data ?? []).map((category) => ({
    id: category.id,
    name: category.name,
  }))

  // Si las pendientes suman lo mismo que la diferencia con signo opuesto, la explican entera.
  // El total llega del servidor y cubre todas las del rango, no solo las de esta página.
  const explanationOf = (data: NonNullable<typeof reconciliation.data>): string | null => {
    if (isZeroMoney(data.difference)) return null
    const rest = BigInt(data.difference.minorUnits) + BigInt(data.pendingTotal.minorUnits)
    if (rest === 0n) return copy.reconciliation.explainedAll(data.pagination.totalItems)
    return copy.reconciliation.explainedPartly(
      formatMoney(absMoney({ minorUnits: rest.toString(), currency: data.difference.currency })),
    )
  }

  const explanation = reconciliation.data ? explanationOf(reconciliation.data) : null

  const suggestionsFor = (lineId: string): MatchSuggestion[] =>
    (reconciliation.data?.suggestions ?? []).filter((suggestion) => suggestion.lineId === lineId)

  return (
    <section className="space-y-6">
      <header className="max-w-[60ch]">
        <h1 className="text-xl font-semibold tracking-tight">{copy.reconciliation.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{copy.reconciliation.description}</p>
      </header>

      <ControlBar>
        <div className="flex flex-col gap-1">
          <Label htmlFor="bank-account" className="text-xs font-normal text-muted-foreground">
            {copy.reconciliation.account.label}
          </Label>
          <Select value={bankAccountId} onValueChange={setBankAccountId}>
            <SelectTrigger id="bank-account" className="h-8 w-56">
              <SelectValue placeholder={copy.reconciliation.account.label} />
            </SelectTrigger>
            <SelectContent>
              {(accounts.data ?? []).map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <RangeFields from={from} to={to} onFrom={setFrom} onTo={setTo} />
      </ControlBar>

      {accounts.isSuccess && accounts.data.length === 0 ? (
        <EmptyState
          title={copy.accounts.empty.title}
          description={copy.accounts.empty.description}
          action={
            <Button size="sm" asChild>
              <Link to="/banco/cuentas">{copy.accounts.empty.action}</Link>
            </Button>
          }
        />
      ) : bankAccountId === '' ? (
        only || accounts.isPending ? (
          <div className="space-y-3" role="status" aria-label={copy.common.loading}>
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <EmptyState
            title={copy.reconciliation.pickAccount.title}
            description={copy.reconciliation.pickAccount.description}
          />
        )
      ) : reconciliation.isPending ? (
        <div className="space-y-5">
          <Skeleton className="h-24 w-full rounded-xl" />
          <TableSkeleton rows={4} label={copy.common.loading} />
        </div>
      ) : reconciliation.isError ? (
        <ErrorState
          title={copy.common.error.title}
          description={copy.common.error.description}
          retryLabel={copy.common.retry}
          onRetry={() => void reconciliation.refetch()}
        />
      ) : (
        <div className="space-y-6">
          {/* Los tres saldos, siempre a la vista: la diferencia es la pregunta de la pantalla. */}
          <StatGrid>
            <StatCard
              icon={Scale}
              className="@xl:col-span-2"
              label={copy.reconciliation.difference}
              hint={
                <>
                  {isZeroMoney(reconciliation.data.difference)
                    ? copy.reconciliation.balanced
                    : reconciliation.data.difference.minorUnits.startsWith('-')
                      ? copy.reconciliation.statementHigher(
                          formatMoney(absMoney(reconciliation.data.difference)),
                        )
                      : copy.reconciliation.ledgerHigher(
                          formatMoney(reconciliation.data.difference),
                        )}
                  {explanation ? <span className="mt-1 block">{explanation}</span> : null}
                </>
              }
            >
              <Amount
                money={reconciliation.data.difference}
                emphasis="strong"
                tone={isZeroMoney(reconciliation.data.difference) ? 'plain' : 'alert'}
                className="block text-left text-3xl tracking-tight"
              />
            </StatCard>
            <StatCard icon={BookOpen} label={copy.reconciliation.ledgerMovement}>
              <Amount
                money={reconciliation.data.ledgerMovement}
                className="block text-left text-2xl"
              />
            </StatCard>
            <StatCard icon={Banknote} label={copy.reconciliation.statementMovement}>
              <Amount
                money={reconciliation.data.statementMovement}
                className="block text-left text-2xl"
              />
            </StatCard>
          </StatGrid>

          {reconciliation.data.lines.length === 0 ? (
            <EmptyState
              title={copy.reconciliation.empty.title}
              description={copy.reconciliation.empty.description}
              action={
                <Button variant="secondary" size="sm" asChild>
                  <Link to="/banco/importar">{copy.reconciliation.empty.action}</Link>
                </Button>
              }
            />
          ) : (
            <div>
              <h2 className={cn('flex items-center gap-2 text-base font-medium tracking-tight')}>
                <ListTodo className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                {copy.reconciliation.pending}{' '}
                <span className="num text-muted-foreground">
                  {reconciliation.data.pagination.totalItems}
                </span>
              </h2>

              <p className="mt-0.5 max-w-[75ch] text-xs text-muted-foreground">
                {copy.reconciliation.noSuggestionHint}
              </p>

              <TableFrame className="mt-2">
                <FrameHeader className={cn('hidden gap-x-4 @4xl:grid', COLS)}>
                  <span>{copy.reconciliation.columns.date}</span>
                  <span>{copy.reconciliation.columns.description}</span>
                  <span className="text-right">{copy.reconciliation.columns.amount}</span>
                  <span>{copy.reconciliation.columns.action}</span>
                </FrameHeader>

                <ul className="divide-y divide-border">
                  {reconciliation.data.lines.map((line) => (
                    <Pair
                      key={line.id}
                      line={line}
                      suggestions={suggestionsFor(line.id)}
                      movementLabel={(movementId) => movementById.get(movementId) ?? movementId}
                      categories={categoryOptions}
                      onMatch={(movementId) => match.mutate({ lineId: line.id, movementId })}
                      onIgnore={() => ignore.mutate(line.id)}
                      onCreate={(categoryId) => toMovement.mutate({ lineId: line.id, categoryId })}
                    />
                  ))}
                </ul>
              </TableFrame>

              <Pager
                page={page}
                pageSize={PAGE_SIZE}
                totalItems={reconciliation.data.pagination.totalItems}
                labels={copy.common.pager}
                onPage={setPage}
              />
            </div>
          )}

          {reconciliation.data.resolved.length > 0 ? (
            <div>
              <h2 className="flex items-center gap-2 text-base font-medium tracking-tight">
                <CircleCheck className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                {copy.reconciliation.resolved.title}{' '}
                <span className="num text-muted-foreground">
                  {reconciliation.data.resolved.length}
                </span>
              </h2>
              <p className="mt-0.5 max-w-[65ch] text-xs text-muted-foreground">
                {copy.reconciliation.resolved.hint}
              </p>

              <TableFrame className="mt-2">
                <ul className="divide-y divide-border">
                  {reconciliation.data.resolved.map((line) => (
                    <ResolvedLine
                      key={line.id}
                      line={line}
                      onUndo={() => unmatch.mutate(line.id)}
                    />
                  ))}
                </ul>
              </TableFrame>
            </div>
          ) : null}
        </div>
      )}
    </section>
  )
}

export const Route = createFileRoute('/banco/conciliacion')({ component: ReconciliationScreen })
