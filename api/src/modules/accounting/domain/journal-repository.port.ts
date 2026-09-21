import type { CurrencyCode } from '../../../shared/kernel/currency.js'
import type { DateRange } from '../../../shared/kernel/date-range.js'
import type { JournalEntry } from './journal-entry.js'

export interface AccountMovementTotals {
  readonly accountCode: string
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
  ledgerFor(accountCode: string, currency: CurrencyCode, range: DateRange): Promise<JournalEntry[]>
  openingBalanceFor(
    accountCode: string,
    currency: CurrencyCode,
    before: Date,
  ): Promise<{ debits: bigint; credits: bigint }>
}

export const JOURNAL_REPOSITORY = Symbol('JOURNAL_REPOSITORY')
