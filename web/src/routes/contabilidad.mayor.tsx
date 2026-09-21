import { Link, createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
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
import { ControlBar, CurrencyField, RangeFields } from '@/features/accounting/report-controls'
import type { CurrencyCode } from '@/features/accounting/types'
import { useAccounts, useLedger } from '@/features/accounting/use-accounting'
import { formatIsoDate, monthEnd, monthStart, today } from '@/lib/dates'

interface LedgerSearch {
  account?: string
  currency?: CurrencyCode
  from?: string
  to?: string
}

const LedgerScreen = () => {
  const search = useSearch({ from: '/contabilidad/mayor' })
  const navigate = useNavigate({ from: '/contabilidad/mayor' })

  // El estado vive en la URL, no en el componente: así rastrear un saldo desde la
  // comprobación llega con su moneda y su rango, y el enlace se puede guardar.
  const account = search.account ?? ''
  const currency = search.currency ?? 'CRC'
  const from = search.from ?? monthStart(today())
  const to = search.to ?? monthEnd(today())

  const update = (patch: Partial<LedgerSearch>) =>
    void navigate({ search: (current) => ({ ...current, ...patch }) })

  const setAccount = (value: string) => update({ account: value })
  const setCurrency = (value: CurrencyCode) => update({ currency: value })
  const setFrom = (value: string) => update({ from: value })
  const setTo = (value: string) => update({ to: value })

  const accounts = useAccounts()
  const ledger = useLedger(account, currency, from, to)

  const all = accounts.data?.data ?? []
  const parents = new Set(all.map((item) => item.parentCode).filter(Boolean))
  const postable = all.filter((item) => !parents.has(item.code))

  return (
    <section className="space-y-6">
      <header className="max-w-[60ch]">
        <h1 className="text-xl font-semibold tracking-tight">{copy.ledger.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{copy.ledger.description}</p>
      </header>

      <ControlBar>
        <div className="flex flex-col gap-1">
          <Label htmlFor="account" className="text-xs font-normal text-muted-foreground">
            {copy.ledger.account.label}
          </Label>
          <Select value={account} onValueChange={setAccount}>
            <SelectTrigger id="account" size="sm" className="w-52 sm:w-64">
              <SelectValue placeholder={copy.ledger.account.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {postable.map((item) => (
                <SelectItem key={item.code} value={item.code}>
                  {item.code} · {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <CurrencyField value={currency} onChange={setCurrency} />
        <RangeFields from={from} to={to} onFrom={setFrom} onTo={setTo} />
      </ControlBar>

      {account === '' ? (
        <EmptyState
          title={copy.ledger.needsAccount.title}
          description={copy.ledger.needsAccount.description}
        />
      ) : ledger.isPending ? (
        <div className="space-y-2" role="status" aria-label={copy.common.loading}>
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-8 w-full" />
          ))}
        </div>
      ) : ledger.isError ? (
        <ErrorState
          title={copy.common.error.title}
          description={copy.common.error.description}
          retryLabel={copy.common.retry}
          onRetry={() => void ledger.refetch()}
        />
      ) : (
        <div className="space-y-5">
          {/* Los dos saldos son el marco del extracto: el inicial arriba, el final abajo,
              y entre ellos la corrida que los une. */}
          <div className="flex items-baseline justify-between border-b border-border-strong pb-2">
            <div>
              <p className="text-xs text-muted-foreground">{copy.ledger.openingBalance}</p>
              <p className="mt-0.5 text-[0.6875rem] text-muted-foreground">
                {copy.ledger.openingHint}
              </p>
            </div>
            <Amount money={ledger.data.openingBalance} emphasis="strong" className="text-xl" />
          </div>

          {ledger.data.rows.length === 0 ? (
            <EmptyState title={copy.ledger.empty.title} description={copy.ledger.empty.description} />
          ) : (
            <div>
              {/* La cabecera de columnas solo existe cuando hay columnas: bajo 768 px
                  cada asiento se lee como un bloque, no como una fila con desplazamiento. */}
              <div className="hidden grid-cols-[5.5rem_1fr_7rem_7rem_8rem] gap-2 border-b border-border pb-1 text-xs text-muted-foreground lg:grid">
                <span>{copy.ledger.columns.date}</span>
                <span>{copy.ledger.columns.description}</span>
                <span className="text-right">{copy.ledger.columns.debit}</span>
                <span className="text-right">{copy.ledger.columns.credit}</span>
                <span className="text-right">{copy.ledger.columns.balance}</span>
              </div>

              <ul>
                {ledger.data.rows.map((row, index) => (
                  <li
                    // eslint-disable-next-line react/no-array-index-key
                    key={`${row.entryId}-${index}`}
                    className="grid gap-x-2 gap-y-1 border-b border-border py-2 text-sm lg:grid-cols-[5.5rem_1fr_7rem_7rem_8rem] lg:items-baseline lg:py-1.5"
                  >
                    <span className="num text-xs text-muted-foreground lg:text-right">
                      {formatIsoDate(row.date)}
                    </span>
                    <Link
                      to="/contabilidad/asientos"
                      search={{ entry: row.entryId }}
                      className="min-w-0 truncate underline-offset-2 hover:underline"
                    >
                      {row.description}
                    </Link>
                    <span className="flex justify-between gap-3 lg:contents">
                      <span className="text-xs text-muted-foreground lg:hidden">
                        {copy.ledger.columns.debit}
                      </span>
                      <Amount money={row.debit} />
                    </span>
                    <span className="flex justify-between gap-3 lg:contents">
                      <span className="text-xs text-muted-foreground lg:hidden">
                        {copy.ledger.columns.credit}
                      </span>
                      <Amount money={row.credit} />
                    </span>
                    <span className="flex justify-between gap-3 lg:contents">
                      <span className="text-xs text-muted-foreground lg:hidden">
                        {copy.ledger.columns.balance}
                      </span>
                      <Amount money={row.runningBalance} emphasis="strong" />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-baseline justify-between border-t border-border-strong pt-2">
            <p className="text-base font-medium tracking-tight">{copy.ledger.closingBalance}</p>
            <Amount money={ledger.data.closingBalance} emphasis="strong" className="text-xl" />
          </div>
        </div>
      )}
    </section>
  )
}

export const Route = createFileRoute('/contabilidad/mayor')({
  component: LedgerScreen,
  // El código de cuenta es numérico, así que una URL escrita a mano llega como número.
  // Aceptar las dos formas evita que el enlace copiado a mano caiga en el estado vacío.
  validateSearch: (search: Record<string, unknown>): LedgerSearch => ({
    ...(typeof search.account === 'string' || typeof search.account === 'number'
      ? { account: String(search.account) }
      : {}),
    ...(search.currency === 'CRC' || search.currency === 'USD'
      ? { currency: search.currency }
      : {}),
    ...(typeof search.from === 'string' ? { from: search.from } : {}),
    ...(typeof search.to === 'string' ? { to: search.to } : {}),
  }),
})
