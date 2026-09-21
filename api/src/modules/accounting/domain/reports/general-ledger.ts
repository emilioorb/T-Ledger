import type { CurrencyCode } from '../../../../shared/kernel/currency.js'
import { Money } from '../../../../shared/kernel/money.js'
import { unwrap } from '../../../../shared/kernel/result.js'
import { signedBalance } from '../account-balance.js'
import { normalBalanceOf, type AccountClass } from '../account-class.js'
import type { JournalEntry } from '../journal-entry.js'

export interface LedgerRow {
  readonly date: Date
  readonly entryId: string
  readonly description: string
  readonly debit: Money
  readonly credit: Money
  readonly runningBalance: Money
}

export interface GeneralLedger {
  readonly openingBalance: Money
  readonly rows: LedgerRow[]
  readonly closingBalance: Money
}

export interface OpeningTotals {
  readonly debits: bigint
  readonly credits: bigint
}

const byDateThenId = (a: JournalEntry, b: JournalEntry): number =>
  a.date.getTime() - b.date.getTime() || a.id.localeCompare(b.id)

// El mayor es siempre «una cuenta en una moneda»: las líneas de la otra moneda de un
// asiento de conversión no tienen nada que hacer acá.
export const buildLedger = (
  opening: OpeningTotals,
  entries: readonly JournalEntry[],
  accountCode: string,
  currency: CurrencyCode,
  accountClass: AccountClass,
): GeneralLedger => {
  const openingBalance = signedBalance(
    Money.fromMinorUnits(opening.debits, currency),
    Money.fromMinorUnits(opening.credits, currency),
    accountClass,
  )
  const normal = normalBalanceOf(accountClass)

  const rows: LedgerRow[] = []
  let running = openingBalance

  for (const entry of [...entries].sort(byDateThenId)) {
    for (const line of entry.linesFor(accountCode, currency)) {
      const debit = line.side === 'DEBIT' ? line.amount : Money.zero(currency)
      const credit = line.side === 'CREDIT' ? line.amount : Money.zero(currency)
      const delta =
        normal === 'DEBIT' ? unwrap(debit.subtract(credit)) : unwrap(credit.subtract(debit))

      running = unwrap(running.add(delta))
      rows.push({
        date: entry.date,
        entryId: entry.id,
        description: entry.description,
        debit,
        credit,
        runningBalance: running,
      })
    }
  }

  return { openingBalance, rows, closingBalance: running }
}
