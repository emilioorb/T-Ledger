import type { CurrencyCode } from '../../../shared/kernel/currency.js'
import type { DateRange } from '../../../shared/kernel/date-range.js'
import type { PeriodKey } from './accounting-period.js'
import type { JournalEntry } from './journal-entry.js'

export interface AccountMovementTotals {
  readonly accountCode: string
  readonly debits: bigint
  readonly credits: bigint
}

// El mismo total, pero partido por día. Existe para poder valuar cada movimiento a la tasa
// de cambio de su propio día, que es lo que separa el diferencial cambiario del resto.
export interface DailyAccountTotals {
  readonly accountCode: string
  readonly date: Date
  readonly debits: bigint
  readonly credits: bigint
}

export interface JournalPage {
  readonly items: JournalEntry[]
  readonly totalItems: number
}

export interface JournalRepository {
  save(entry: JournalEntry): Promise<void>
  findById(id: string): Promise<JournalEntry | null>
  findByMovementId(movementId: string): Promise<JournalEntry[]>
  findInRange(range: DateRange, page: number, pageSize: number): Promise<JournalPage>

  // Los reportes no traen los asientos a memoria: agregan en la base. Una comprobación de
  // doce meses sobre miles de asientos no puede traérselos todos para sumarlos en Node.
  totalsByAccount(currency: CurrencyCode, range: DateRange): Promise<AccountMovementTotals[]>
  totalsUpTo(currency: CurrencyCode, at: Date): Promise<AccountMovementTotals[]>
  totalsByAccountPerDay(currency: CurrencyCode, at: Date): Promise<DailyAccountTotals[]>
  ledgerFor(accountCode: string, currency: CurrencyCode, range: DateRange): Promise<JournalEntry[]>

  // Si una cuenta ya tiene asientos no se le pueden colgar hijas: quedaría con saldo propio
  // dentro de una agrupadora, y el árbol dejaría de sumar.
  hasEntriesFor(accountCode: string): Promise<boolean>
  monthsWithEntries(): Promise<PeriodKey[]>
  openingBalanceFor(
    accountCode: string,
    currency: CurrencyCode,
    before: Date,
  ): Promise<{ debits: bigint; credits: bigint }>
}

export const JOURNAL_REPOSITORY = Symbol('JOURNAL_REPOSITORY')
