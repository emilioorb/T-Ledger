import type { Money } from '../../../shared/kernel/money.js'

export type BankLineStatus = 'PENDING' | 'MATCHED' | 'IGNORED'

export interface ParsedLine {
  readonly date: Date
  readonly description: string
  readonly reference: string | null
  // Positivo entra a la cuenta, negativo sale. El signo del extracto, no el del asiento.
  readonly amount: Money
}

export interface StoredBankLine extends ParsedLine {
  readonly id: string
  readonly statementId: string
  readonly bankAccountId: string
  readonly hash: string
  readonly status: BankLineStatus
  readonly movementId: string | null
}
