import type { DateRange } from '../../../shared/kernel/date-range.js'
import type { ParsedLine, StoredBankLine } from './bank-line.js'

export interface StatementHeader {
  readonly id: string
  readonly bankAccountId: string
  readonly fileName: string
}

export interface StoredStatement extends StatementHeader {
  readonly importedAt: Date
  readonly lineCount: number
  readonly duplicateCount: number
}

export interface ImportResult {
  readonly imported: number
  readonly duplicated: number
}

export interface BankLinePage {
  readonly items: StoredBankLine[]
  readonly totalItems: number
}

export interface BankStatementRepository {
  save(statement: StatementHeader, lines: readonly ParsedLine[]): Promise<ImportResult>
  findAll(page: number, pageSize: number): Promise<{ items: StoredStatement[]; totalItems: number }>
  pendingLines(
    bankAccountId: string,
    range: DateRange,
    page: number,
    pageSize: number,
  ): Promise<BankLinePage>
  allLines(bankAccountId: string, range: DateRange): Promise<StoredBankLine[]>
  findLine(id: string): Promise<StoredBankLine | null>
  isMovementTaken(movementId: string, exceptLineId?: string): Promise<boolean>
  markMatched(lineId: string, movementId: string): Promise<void>
  markPending(lineId: string): Promise<void>
  markIgnored(lineId: string): Promise<void>
}

export const BANK_STATEMENT_REPOSITORY = Symbol('BANK_STATEMENT_REPOSITORY')
