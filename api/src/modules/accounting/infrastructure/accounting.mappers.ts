import type { CurrencyCode } from '../../../shared/kernel/currency.js'
import { Money } from '../../../shared/kernel/money.js'
import { unwrap } from '../../../shared/kernel/result.js'
import { AccountingPeriod, PeriodKey, type PeriodStatus } from '../domain/accounting-period.js'
import type { AccountClass } from '../domain/account-class.js'
import { Account } from '../domain/account.js'
import { Category, type CategoryKind } from '../domain/category.js'
import type { ChartOfAccounts } from '../domain/chart-of-accounts.js'
import { JournalEntry, type EntrySide, type JournalLine } from '../domain/journal-entry.js'
import { Movement, type MovementStatus } from '../domain/movement.js'

export interface AccountRow {
  code: string
  name: string
  accountClass: string
  parentCode: string | null
  active: boolean
  sortOrder: number
  isCurrencyBridge: boolean
}

export const accountToDomain = (row: AccountRow): Account =>
  unwrap(
    Account.create({
      code: row.code,
      name: row.name,
      accountClass: row.accountClass as AccountClass,
      parentCode: row.parentCode,
      active: row.active,
      sortOrder: row.sortOrder,
      isCurrencyBridge: row.isCurrencyBridge,
    }),
  )

export interface JournalLineRow {
  accountCode: string
  currency: string
  amountMinor: bigint
  side: string
}

export interface JournalEntryRow {
  id: string
  date: Date
  description: string
  reference: string | null
  sourceMovementId: string | null
  reversesEntryId: string | null
  lines: JournalLineRow[]
}

export const journalEntryToDomain = (
  row: JournalEntryRow,
  chart: ChartOfAccounts,
): JournalEntry => {
  const lines: JournalLine[] = row.lines.map((line) => ({
    accountCode: line.accountCode,
    amount: Money.fromMinorUnits(line.amountMinor, line.currency as CurrencyCode),
    side: line.side as EntrySide,
  }))

  return unwrap(
    JournalEntry.create(
      {
        id: row.id,
        date: row.date,
        description: row.description,
        reference: row.reference,
        lines,
        sourceMovementId: row.sourceMovementId,
        reversesEntryId: row.reversesEntryId,
      },
      chart,
    ),
  )
}

export interface CategoryRow {
  id: string
  name: string
  kind: string
  accountCode: string | null
  sortOrder: number
  active: boolean
  colorIndex: number | null
}

export const categoryToDomain = (row: CategoryRow): Category =>
  unwrap(
    Category.create({
      id: row.id,
      name: row.name,
      kind: row.kind as CategoryKind,
      accountCode: row.accountCode,
      sortOrder: row.sortOrder,
      active: row.active,
      colorIndex: row.colorIndex,
    }),
  )

export interface MovementRow {
  id: string
  date: Date
  kind: string
  categoryId: string
  counterparty: string
  amountMinor: bigint
  currency: string
  paymentAccountCode: string | null
  receiptKey: string | null
  status: string
  version: number
}

export const movementToDomain = (row: MovementRow): Movement =>
  unwrap(
    Movement.create({
      id: row.id,
      date: row.date,
      kind: row.kind as CategoryKind,
      categoryId: row.categoryId,
      counterparty: row.counterparty,
      amount: Money.fromMinorUnits(row.amountMinor, row.currency as CurrencyCode),
      paymentAccountCode: row.paymentAccountCode,
      receiptKey: row.receiptKey,
      status: row.status as MovementStatus,
      version: row.version,
    }),
  )

export interface PeriodRow {
  period: string
  status: string
  closedAt: Date | null
}

export const periodToDomain = (row: PeriodRow): AccountingPeriod =>
  AccountingPeriod.restore(
    unwrap(PeriodKey.parse(row.period)),
    row.status as PeriodStatus,
    row.closedAt,
  )

// Las filas vienen con una fecha por día distinto; el mes con actividad es lo único
// que interesa, así que se colapsan sin repetir.
export const monthsOf = (rows: readonly { date: Date }[]): PeriodKey[] => {
  const months = new Map<string, PeriodKey>()
  for (const row of rows) {
    const key = PeriodKey.fromDate(row.date)
    months.set(key.toString(), key)
  }
  return [...months.values()]
}
