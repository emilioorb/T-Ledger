import { useState } from 'react'
import { createFileRoute, useSearch } from '@tanstack/react-router'
import { BookOpen, Plus } from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
import { FormDialog } from '@/components/form-dialog'
import { Pager } from '@/components/pager'
import { FrameHeader, TableFrame } from '@/components/table-frame'
import { ErrorState } from '@/components/error-state'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Amount } from '@/features/accounting/amount'
import { usePrimaryAction } from '@/features/shortcuts/primary-action'
import { copy } from '@/features/accounting/copy'
import { JournalEntryForm } from '@/features/accounting/journal-entry-form'
import { ControlBar, RangeFields } from '@/features/accounting/report-controls'
import type { JournalEntry } from '@/features/accounting/types'
import {
  useAccounts,
  useCreateJournalEntry,
  PAGE_SIZE,
  useJournalEntries,
} from '@/features/accounting/use-accounting'
import { formatIsoDate, monthEnd, monthStart, today } from '@/lib/dates'
import { formatMoney, type CurrencyCode as MoneyCurrency } from '@/lib/money'
import { usePage } from '@/lib/use-page'
import { cn } from '@/lib/utils'

interface JournalSearch {
  entry?: string
}

// El total por moneda y lado es la prueba de que la partida cierra: sin él hay que
// sumar a ojo las líneas para saber si el asiento está sano.
const totalsOf = (entry: JournalEntry) => {
  const totals = new Map<string, { debit: bigint; credit: bigint }>()
  for (const line of entry.lines) {
    const current = totals.get(line.amount.currency) ?? { debit: 0n, credit: 0n }
    const amount = BigInt(line.amount.minorUnits)
    totals.set(line.amount.currency, {
      debit: current.debit + (line.side === 'DEBIT' ? amount : 0n),
      credit: current.credit + (line.side === 'CREDIT' ? amount : 0n),
    })
  }
  return [...totals.entries()]
}

interface EntryProps {
  entry: JournalEntry
  nameOf: Map<string, string>
  highlighted: boolean
}

// La unidad de esta vista es el asiento, no la línea: cabecera con su fecha y descripción,
// y debajo sus líneas en dos columnas. Una tabla plana perdería esa agrupación.
const EntryBlock = ({ entry, nameOf, highlighted }: EntryProps) => (
  <article id={entry.id} className={cn('px-3 py-4', highlighted && 'bg-accent')}>
    {/* La cabecera vive fuera de la rejilla de columnas: dentro, «Reversión» caía en la
        columna Debe y se leía como un importe. */}
    <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 pr-[14rem]">
      <span className="num text-xs text-muted-foreground">{formatIsoDate(entry.date)}</span>
      <h3 className="min-w-0 flex-1 truncate text-sm font-medium tracking-tight">
        {entry.description}
      </h3>
      {entry.reversesEntryId ? (
        <span className="text-xs text-warning">{copy.journal.reversal}</span>
      ) : null}
      {entry.sourceMovementId ? (
        <span className="text-xs text-muted-foreground">{copy.journal.fromMovement}</span>
      ) : null}
    </header>

    <ul className="mt-2">
      {entry.lines.map((line, index) => (
        <li
          // eslint-disable-next-line react/no-array-index-key
          key={`${entry.id}-${index}`}
          className="grid grid-cols-[1fr_auto] items-baseline gap-2 py-0.5 text-sm md:grid-cols-[1fr_7rem_7rem]"
        >
          <span className="min-w-0 truncate">
            <span className="num num-right text-xs text-muted-foreground">{line.accountCode}</span>{' '}
            {nameOf.get(line.accountCode)}
          </span>
          {line.side === 'DEBIT' ? <Amount money={line.amount} /> : <span aria-hidden="true" />}
          {line.side === 'CREDIT' ? <Amount money={line.amount} /> : <span aria-hidden="true" />}
        </li>
      ))}
    </ul>

    <footer className="mt-1 border-t border-border pt-1">
      {totalsOf(entry).map(([currency, total]) => (
        <div
          key={currency}
          className="grid grid-cols-[1fr_auto] items-baseline gap-2 text-xs text-muted-foreground md:grid-cols-[1fr_7rem_7rem]"
        >
          <span>{currency}</span>
          <span className="num num-right">
            {formatMoney({
              minorUnits: total.debit.toString(),
              currency: currency as MoneyCurrency,
            })}
          </span>
          <span className="num num-right">
            {formatMoney({
              minorUnits: total.credit.toString(),
              currency: currency as MoneyCurrency,
            })}
          </span>
        </div>
      ))}
    </footer>
  </article>
)

const JournalScreen = () => {
  const search = useSearch({ from: '/contabilidad/asientos' })
  const [from, setFrom] = useState(monthStart(today()))
  const [to, setTo] = useState(monthEnd(today()))
  const [composing, setComposing] = useState(false)

  usePrimaryAction(copy.journal.new, () => setComposing(true))

  const [page, setPage] = usePage(`${from}|${to}`)
  const entries = useJournalEntries(from, to, page)
  const accounts = useAccounts()
  const create = useCreateJournalEntry()

  const all = accounts.data?.data ?? []
  const parents = new Set(all.map((account) => account.parentCode).filter(Boolean))
  const postable = all.filter((account) => account.active && !parents.has(account.code))
  const nameOf = new Map(all.map((account) => [account.code, account.name]))
  const items = entries.data?.data ?? []

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-[60ch]">
          <h1 className="text-xl font-semibold tracking-tight">{copy.journal.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{copy.journal.description}</p>
        </div>
        <Button size="sm" onClick={() => setComposing(true)}>
          <Plus className="size-4" aria-hidden="true" />
          {copy.journal.new}
        </Button>
      </header>

      <FormDialog
        icon={BookOpen}
        open={composing}
        className="sm:max-w-3xl"
        title={copy.journal.form.title}
        onOpenChange={setComposing}
      >
        {composing ? (
          <JournalEntryForm
            postable={postable}
            pending={create.isPending}
            onSubmit={(input) => create.mutate(input, { onSuccess: () => setComposing(false) })}
            onCancel={() => setComposing(false)}
          />
        ) : null}
      </FormDialog>

      <ControlBar separated={false}>
        <RangeFields from={from} to={to} onFrom={setFrom} onTo={setTo} />
      </ControlBar>

      {entries.isPending ? (
        <div className="space-y-4" role="status" aria-label={copy.common.loading}>
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-20 w-full" />
          ))}
        </div>
      ) : entries.isError ? (
        <ErrorState
          title={copy.common.error.title}
          description={copy.common.error.description}
          retryLabel={copy.common.retry}
          onRetry={() => void entries.refetch()}
        />
      ) : items.length === 0 ? (
        <EmptyState title={copy.journal.empty.title} description={copy.journal.empty.description} />
      ) : (
        <div className="space-y-4">
          <TableFrame>
            <FrameHeader className="hidden grid-cols-[1fr_7rem_7rem] gap-2 md:grid">
              <span>{copy.journal.columns.account}</span>
              <span className="text-right">{copy.journal.columns.debit}</span>
              <span className="text-right">{copy.journal.columns.credit}</span>
            </FrameHeader>

            <div className="divide-y divide-border">
              {items.map((entry) => (
                <EntryBlock
                  key={entry.id}
                  entry={entry}
                  nameOf={nameOf}
                  highlighted={entry.id === search.entry}
                />
              ))}
            </div>
          </TableFrame>

          <Pager
            page={page}
            pageSize={PAGE_SIZE}
            totalItems={entries.data.pagination.totalItems}
            labels={copy.common.pager}
            onPage={setPage}
          />
        </div>
      )}
    </section>
  )
}

export const Route = createFileRoute('/contabilidad/asientos')({
  component: JournalScreen,
  validateSearch: (search: Record<string, unknown>): JournalSearch =>
    typeof search.entry === 'string' ? { entry: search.entry } : {},
})
