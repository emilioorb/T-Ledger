import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { EmptyState } from '@/components/empty-state'
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
import { copy } from '@/features/banking/copy'
import type { BankLine, MatchSuggestion } from '@/features/banking/types'
import {
  useBankAccounts,
  useIgnoreLine,
  useLineToMovement,
  useMatchLine,
  useReconciliation,
} from '@/features/banking/use-banking'
import { formatIsoDate, monthEnd, monthStart, today } from '@/lib/dates'
import { formatMoney } from '@/lib/money'
import { cn } from '@/lib/utils'

interface PairProps {
  line: BankLine
  suggestions: MatchSuggestion[]
  movementLabel: (movementId: string) => string
  categories: { id: string; name: string }[]
  onMatch: (movementId: string) => void
  onIgnore: () => void
  onCreate: (categoryId: string) => void
}

// La unidad de esta pantalla es la pareja, no la línea: banco a la izquierda, movimiento
// sugerido a la derecha, y la razón entre los dos. Una tabla de líneas obligaría a buscar el
// movimiento en otra parte, que es el trabajo que la pantalla existe para evitar.
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
    <li className="grid gap-x-6 gap-y-3 border-b border-border py-4 lg:grid-cols-2">
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <span className="min-w-0 truncate text-sm">{line.description}</span>
          <Amount money={line.amount} emphasis="strong" className="shrink-0 text-sm" />
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          <span className="num text-left">{formatIsoDate(line.date)}</span>
          {line.reference ? ` · ${line.reference}` : ''}
        </p>
      </div>

      <div>
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
                    <span className="truncate text-sm">{movementLabel(suggestion.movementId)}</span>
                    <span className="block text-xs text-muted-foreground">
                      {copy.reconciliation.reasons[suggestion.reason]}
                    </span>
                  </span>
                  <Button size="sm" onClick={() => onMatch(suggestion.movementId)}>
                    {copy.reconciliation.confirm}
                  </Button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div>
            <p className="text-sm">{copy.reconciliation.noSuggestion}</p>
            <p className="mt-0.5 max-w-[60ch] text-xs text-muted-foreground">
              {copy.reconciliation.noSuggestionHint}
            </p>

            <div className="mt-2 flex flex-wrap items-end gap-2">
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger size="sm" className="w-48" aria-label={copy.reconciliation.category.label}>
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
              <Button size="sm" disabled={categoryId === ''} onClick={() => onCreate(categoryId)}>
                {copy.reconciliation.toMovement}
              </Button>
            </div>
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="mt-2 h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
          title={copy.reconciliation.ignoreHint}
          onClick={onIgnore}
        >
          {copy.reconciliation.ignore}
        </Button>
      </div>
    </li>
  )
}

const ReconciliationScreen = () => {
  const [bankAccountId, setBankAccountId] = useState('')
  const [from, setFrom] = useState(monthStart(today()))
  const [to, setTo] = useState(monthEnd(today()))

  const accounts = useBankAccounts()
  const reconciliation = useReconciliation(bankAccountId, from, to)
  const categories = useCategories()
  const movements = useMovements({ from, to, status: 'ACTIVE' })
  const match = useMatchLine()
  const ignore = useIgnoreLine()
  const toMovement = useLineToMovement()

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
            <SelectTrigger id="bank-account" size="sm" className="w-56">
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

      {bankAccountId === '' ? (
        <EmptyState
          title={copy.reconciliation.account.label}
          description={copy.accounts.empty.description}
          action={
            <Button size="sm" asChild>
              <Link to="/banco/cuentas">{copy.accounts.empty.action}</Link>
            </Button>
          }
        />
      ) : reconciliation.isPending ? (
        <div className="space-y-3" role="status" aria-label={copy.common.loading}>
          <Skeleton className="h-20 w-full" />
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
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
          <div className="flex flex-wrap items-end justify-between gap-4 border-y border-border-strong py-4">
            <div>
              <p className="text-xs text-muted-foreground">{copy.reconciliation.difference}</p>
              <Amount
                money={reconciliation.data.difference}
                emphasis="strong"
                tone={isZeroMoney(reconciliation.data.difference) ? 'plain' : 'alert'}
                className="mt-1 block text-left text-3xl tracking-tight"
              />
              <p className="mt-1 max-w-[52ch] text-xs text-muted-foreground">
                {isZeroMoney(reconciliation.data.difference)
                  ? copy.reconciliation.balanced
                  : copy.reconciliation.unbalanced}
              </p>
            </div>

            <dl className="flex gap-6 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">
                  {copy.reconciliation.ledgerBalance}
                </dt>
                <dd>
                  <Amount money={reconciliation.data.ledgerBalance} />
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">
                  {copy.reconciliation.statementBalance}
                </dt>
                <dd>
                  <Amount money={reconciliation.data.statementBalance} />
                </dd>
              </div>
            </dl>
          </div>

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
              <h2 className={cn('text-sm font-medium tracking-tight')}>
                {copy.reconciliation.pending}{' '}
                <span className="num text-left text-muted-foreground">
                  {reconciliation.data.pagination.totalItems}
                </span>
              </h2>

              <ul className="mt-2">
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
            </div>
          )}
        </div>
      )}
    </section>
  )
}

export const Route = createFileRoute('/banco/conciliacion')({ component: ReconciliationScreen })
