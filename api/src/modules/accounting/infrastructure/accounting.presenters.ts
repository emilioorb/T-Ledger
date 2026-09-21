import type { z } from 'zod'
import { fromMoney } from '../../../shared/http/money.schema.js'
import type { AccountingPeriod } from '../domain/accounting-period.js'
import type { Account } from '../domain/account.js'
import type { Category } from '../domain/category.js'
import type { JournalEntry } from '../domain/journal-entry.js'
import type { Movement } from '../domain/movement.js'
import type { CloseBlocker, PeriodSnapshot } from '../domain/period-closing.js'
import type { FinancialPosition } from '../domain/reports/financial-position.js'
import type { GeneralLedger } from '../domain/reports/general-ledger.js'
import type { IncomeStatement } from '../domain/reports/income-statement.js'
import type { ReportNode } from '../domain/reports/roll-up.js'
import type { TrialBalance } from '../domain/reports/trial-balance.js'
import type {
  accountResponseSchema,
  categoryResponseSchema,
  financialPositionResponseSchema,
  incomeStatementResponseSchema,
  journalEntryResponseSchema,
  ledgerResponseSchema,
  movementResponseSchema,
  periodResponseSchema,
  periodSummaryResponseSchema,
  trialBalanceResponseSchema,
  ReportNodeResponse,
} from './accounting.responses.js'

type Account_ = z.infer<typeof accountResponseSchema>
type Category_ = z.infer<typeof categoryResponseSchema>
type Movement_ = z.infer<typeof movementResponseSchema>
type JournalEntry_ = z.infer<typeof journalEntryResponseSchema>
type TrialBalance_ = z.infer<typeof trialBalanceResponseSchema>
type Ledger_ = z.infer<typeof ledgerResponseSchema>
type Position_ = z.infer<typeof financialPositionResponseSchema>
type IncomeStatement_ = z.infer<typeof incomeStatementResponseSchema>
type Period_ = z.infer<typeof periodResponseSchema>
type PeriodSummary_ = z.infer<typeof periodSummaryResponseSchema>

const isoDate = (date: Date): string => date.toISOString().slice(0, 10)

export const toAccountResponse = (account: Account): Account_ => ({
  code: account.code,
  name: account.name,
  accountClass: account.accountClass,
  parentCode: account.parentCode,
  active: account.active,
  sortOrder: account.sortOrder,
})

export const toCategoryResponse = (category: Category): Category_ => ({
  id: category.id,
  name: category.name,
  kind: category.kind,
  accountCode: category.accountCode,
  sortOrder: category.sortOrder,
  active: category.active,
  postable: category.isPostable(),
})

// `posted` y `journalEntryId` son lo que permite a la interfaz distinguir un movimiento
// contabilizado de uno que solo quedó registrado, y saltar a su asiento.
export const toMovementResponse = (
  movement: Movement,
  journalEntryId: string | null,
): Movement_ => ({
  id: movement.id,
  date: isoDate(movement.date),
  kind: movement.kind,
  categoryId: movement.categoryId,
  counterparty: movement.counterparty,
  amount: fromMoney(movement.amount),
  paymentAccountCode: movement.paymentAccountCode,
  receiptUrl: movement.receiptUrl,
  status: movement.status,
  posted: journalEntryId !== null,
  journalEntryId,
})

export const toJournalEntryResponse = (entry: JournalEntry): JournalEntry_ => ({
  id: entry.id,
  date: isoDate(entry.date),
  description: entry.description,
  reference: entry.reference,
  sourceMovementId: entry.sourceMovementId,
  reversesEntryId: entry.reversesEntryId,
  lines: entry.lines.map((line) => ({
    accountCode: line.accountCode,
    amount: fromMoney(line.amount),
    side: line.side,
  })),
})

export const toReportNodeResponse = (node: ReportNode): ReportNodeResponse => ({
  code: node.accountCode,
  name: node.accountName,
  balance: fromMoney(node.balance),
  level: node.level,
  children: node.children.map(toReportNodeResponse),
})

export const toTrialBalanceResponse = (balance: TrialBalance): TrialBalance_ => ({
  rows: balance.rows.map((row) => ({
    accountCode: row.accountCode,
    accountName: row.accountName,
    debits: fromMoney(row.debits),
    credits: fromMoney(row.credits),
    balance: fromMoney(row.balance),
  })),
  totalDebits: fromMoney(balance.totalDebits),
  totalCredits: fromMoney(balance.totalCredits),
  difference: fromMoney(balance.difference),
  balances: balance.balances,
})

export const toLedgerResponse = (ledger: GeneralLedger): Ledger_ => ({
  openingBalance: fromMoney(ledger.openingBalance),
  rows: ledger.rows.map((row) => ({
    date: isoDate(row.date),
    entryId: row.entryId,
    description: row.description,
    debit: fromMoney(row.debit),
    credit: fromMoney(row.credit),
    runningBalance: fromMoney(row.runningBalance),
  })),
  closingBalance: fromMoney(ledger.closingBalance),
})

export const toFinancialPositionResponse = (position: FinancialPosition): Position_ => ({
  assets: fromMoney(position.assets),
  liabilities: fromMoney(position.liabilities),
  equity: fromMoney(position.equity),
  periodResult: fromMoney(position.periodResult),
  balances: position.balances,
  sections: {
    assets: position.sections.assets.map(toReportNodeResponse),
    liabilities: position.sections.liabilities.map(toReportNodeResponse),
    equity: position.sections.equity.map(toReportNodeResponse),
  },
})

export const toIncomeStatementResponse = (statement: IncomeStatement): IncomeStatement_ => ({
  income: fromMoney(statement.income),
  costOfRevenue: fromMoney(statement.costOfRevenue),
  operatingExpenses: fromMoney(statement.operatingExpenses),
  result: fromMoney(statement.result),
  sections: {
    income: statement.sections.income.map(toReportNodeResponse),
    costOfRevenue: statement.sections.costOfRevenue.map(toReportNodeResponse),
    operatingExpenses: statement.sections.operatingExpenses.map(toReportNodeResponse),
  },
})

export const toPeriodResponse = (period: AccountingPeriod): Period_ => ({
  period: period.key.toString(),
  status: period.status,
  closedAt: period.closedAt?.toISOString() ?? null,
})

export const toPeriodSummaryResponse = (
  snapshot: PeriodSnapshot,
  blockers: CloseBlocker[],
): PeriodSummary_ => ({
  period: snapshot.key.toString(),
  status: snapshot.status,
  entryCount: snapshot.entryCount,
  unpostedMovementCount: snapshot.unpostedMovementCount,
  trialBalanceBalances: snapshot.trialBalanceBalances,
  blockers,
})

const CSV_HEADERS = ['codigo', 'cuenta', 'debitos', 'creditos', 'saldo']

const escapeCsv = (value: string): string =>
  /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value

// El CSV sale del mismo objeto que sirve el JSON: dos caminos para el mismo reporte
// terminan divergiendo.
export const trialBalanceToCsv = (balance: TrialBalance): string =>
  [
    CSV_HEADERS.join(','),
    ...balance.rows.map((row) =>
      [
        row.accountCode,
        escapeCsv(row.accountName),
        row.debits.minorUnits.toString(),
        row.credits.minorUnits.toString(),
        row.balance.minorUnits.toString(),
      ].join(','),
    ),
  ].join('\n')
