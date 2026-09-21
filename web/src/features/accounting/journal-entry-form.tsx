import { useState, type FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
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
import { formatMoney, parseMoneyInput, type CurrencyCode as MoneyCurrency } from '@/lib/money'
import { today } from '@/lib/dates'
import { copy } from './copy'
import type { Account, CurrencyCode, EntrySide, JournalEntryInput } from './types'

interface LineDraft {
  accountCode: string
  side: EntrySide
  amount: string
  currency: CurrencyCode
}

interface Props {
  postable: Account[]
  pending: boolean
  onSubmit: (input: JournalEntryInput) => void
  onCancel: () => void
}

const CURRENCIES: CurrencyCode[] = ['CRC', 'USD']

const emptyLine = (currency: CurrencyCode): LineDraft => ({
  accountCode: '',
  side: 'DEBIT',
  amount: '',
  currency,
})

const minorUnitsOf = (line: LineDraft): bigint => {
  try {
    return BigInt(parseMoneyInput(line.amount, line.currency as MoneyCurrency).minorUnits)
  } catch {
    return 0n
  }
}

interface CurrencyBalance {
  currency: CurrencyCode
  difference: bigint
}

// La suma por moneda se calcula mientras se escribe: ver el descuadre antes de enviar
// evita el ciclo de mandar, recibir 422 y volver.
const balancesOf = (lines: LineDraft[]): CurrencyBalance[] => {
  const totals = new Map<CurrencyCode, bigint>()
  for (const line of lines) {
    const signed = line.side === 'DEBIT' ? minorUnitsOf(line) : -minorUnitsOf(line)
    totals.set(line.currency, (totals.get(line.currency) ?? 0n) + signed)
  }
  return [...totals.entries()].map(([currency, difference]) => ({ currency, difference }))
}

export const JournalEntryForm = ({ postable, pending, onSubmit, onCancel }: Props) => {
  const [date, setDate] = useState(today())
  const [description, setDescription] = useState('')
  const [reference, setReference] = useState('')
  const [lines, setLines] = useState<LineDraft[]>([emptyLine('CRC'), emptyLine('CRC')])

  const fields = copy.journal.form
  const balances = balancesOf(lines)
  const isBalanced =
    balances.length > 0 &&
    balances.every((balance) => balance.difference === 0n) &&
    lines.every((line) => line.accountCode !== '' && minorUnitsOf(line) > 0n)

  const update = (index: number, patch: Partial<LineDraft>) =>
    setLines((current) => current.map((line, at) => (at === index ? { ...line, ...patch } : line)))

  const submit = (event: FormEvent) => {
    event.preventDefault()
    onSubmit({
      date,
      description,
      reference: reference.trim() === '' ? null : reference.trim(),
      lines: lines.map((line) => ({
        accountCode: line.accountCode,
        side: line.side,
        amount: parseMoneyInput(line.amount, line.currency as MoneyCurrency),
      })),
    })
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-[10rem_1fr_1fr]">
        <div className="space-y-1.5">
          <Label htmlFor="entry-date">{fields.date.label}</Label>
          <Input
            id="entry-date"
            type="date"
            value={date}
            required
            onChange={(event) => setDate(event.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="entry-description">{fields.description.label}</Label>
          <Input
            id="entry-description"
            value={description}
            required
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="entry-reference">{fields.reference.label}</Label>
          <Input
            id="entry-reference"
            value={reference}
            onChange={(event) => setReference(event.target.value)}
          />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium tracking-tight">{fields.lines}</h3>
        <p className="mt-0.5 max-w-[65ch] text-xs text-muted-foreground">{fields.balanceHint}</p>

        <ul className="mt-3 space-y-2">
          {lines.map((line, index) => (
            // eslint-disable-next-line react/no-array-index-key
            <li key={index} className="grid gap-2 sm:grid-cols-[1fr_7rem_9rem_5rem_auto]">
              <Select
                value={line.accountCode}
                onValueChange={(next) => update(index, { accountCode: next })}
              >
                <SelectTrigger aria-label={fields.account} className="w-full">
                  <SelectValue placeholder={fields.account} />
                </SelectTrigger>
                <SelectContent>
                  {postable.map((account) => (
                    <SelectItem key={account.code} value={account.code}>
                      {account.code} · {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={line.side}
                onValueChange={(next) => update(index, { side: next as EntrySide })}
              >
                <SelectTrigger aria-label={fields.side.label} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DEBIT">{fields.side.debit}</SelectItem>
                  <SelectItem value="CREDIT">{fields.side.credit}</SelectItem>
                </SelectContent>
              </Select>

              <Input
                value={line.amount}
                inputMode="decimal"
                aria-label={fields.amount}
                className="num num-right"
                onChange={(event) => update(index, { amount: event.target.value })}
              />

              <Select
                value={line.currency}
                onValueChange={(next) => update(index, { currency: next as CurrencyCode })}
              >
                <SelectTrigger aria-label={fields.currency} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((code) => (
                    <SelectItem key={code} value={code}>
                      {code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={fields.removeLine(index + 1)}
                disabled={lines.length <= 2}
                onClick={() => setLines((current) => current.filter((_, at) => at !== index))}
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-3"
          onClick={() => setLines((current) => [...current, emptyLine(current[0]?.currency ?? 'CRC')])}
        >
          {fields.addLine}
        </Button>
      </div>

      <div className="border-y border-border py-3">
        <h3 className="text-xs font-medium text-muted-foreground">{fields.balanceByCurrency}</h3>
        <ul className="mt-1.5 space-y-1">
          {balances.map((balance) => (
            <li key={balance.currency} className="flex items-baseline gap-3 text-sm">
              <span className="w-10 text-muted-foreground">{balance.currency}</span>
              {balance.difference === 0n ? (
                <span className="text-positive">{fields.balanced}</span>
              ) : (
                <span className="text-negative">
                  {fields.unbalanced(
                    balance.currency,
                    formatMoney({
                      minorUnits: (balance.difference < 0n
                        ? -balance.difference
                        : balance.difference
                      ).toString(),
                      currency: balance.currency as MoneyCurrency,
                    }),
                  )}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending || !isBalanced}>
          {fields.submit}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          {copy.common.cancel}
        </Button>
      </div>
    </form>
  )
}
