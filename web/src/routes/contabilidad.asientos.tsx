import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Amount } from '@/features/accounting/amount'
import { copy } from '@/features/accounting/copy'
import { JournalEntryForm } from '@/features/accounting/journal-entry-form'
import { ControlBar, RangeFields } from '@/features/accounting/report-controls'
import type { JournalEntry } from '@/features/accounting/types'
import {
  useAccounts,
  useCreateJournalEntry,
  useJournalEntries,
} from '@/features/accounting/use-accounting'
import { formatIsoDate, monthEnd, monthStart, today } from '@/lib/dates'

interface EntryProps {
  entry: JournalEntry
  nameOf: Map<string, string>
}

// La unidad de esta vista es el asiento, no la línea: cabecera con su fecha y descripción,
// y debajo sus líneas en dos columnas. Una tabla plana perdería esa agrupación.
const EntryBlock = ({ entry, nameOf }: EntryProps) => (
  <article className="border-b border-border py-4">
    <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
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
            <span className="num text-xs text-muted-foreground">{line.accountCode}</span>{' '}
            {nameOf.get(line.accountCode)}
          </span>
          {line.side === 'DEBIT' ? (
            <Amount money={line.amount} />
          ) : (
            <span aria-hidden="true" />
          )}
          {line.side === 'CREDIT' ? (
            <Amount money={line.amount} />
          ) : (
            <span aria-hidden="true" />
          )}
        </li>
      ))}
    </ul>
  </article>
)

const JournalScreen = () => {
  const [from, setFrom] = useState(monthStart(today()))
  const [to, setTo] = useState(monthEnd(today()))
  const [composing, setComposing] = useState(false)

  const entries = useJournalEntries(from, to)
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

      {composing ? (
        <div className="border-y border-border py-5">
          <h2 className="mb-4 text-base font-medium tracking-tight">{copy.journal.form.title}</h2>
          <JournalEntryForm
            postable={postable}
            pending={create.isPending}
            onSubmit={(input) =>
              create.mutate(input, { onSuccess: () => setComposing(false) })
            }
            onCancel={() => setComposing(false)}
          />
        </div>
      ) : null}

      <ControlBar>
        <RangeFields from={from} to={to} onFrom={setFrom} onTo={setTo} />
      </ControlBar>

      {entries.isPending ? (
        <div className="space-y-4" aria-label={copy.common.loading}>
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
        <div>
          <div className="hidden grid-cols-[1fr_7rem_7rem] gap-2 border-b border-border-strong pb-1 text-xs text-muted-foreground md:grid">
            <span>{copy.journal.columns.account}</span>
            <span className="text-right">{copy.journal.columns.debit}</span>
            <span className="text-right">{copy.journal.columns.credit}</span>
          </div>
          {items.map((entry) => (
            <EntryBlock key={entry.id} entry={entry} nameOf={nameOf} />
          ))}
        </div>
      )}
    </section>
  )
}

export const Route = createFileRoute('/contabilidad/asientos')({ component: JournalScreen })
