export const DEBT_KINDS = ['FRENCH', 'FIXED_PRINCIPAL', 'INTEREST_FREE'] as const

export type DebtKind = (typeof DEBT_KINDS)[number]

export const isDebtKind = (value: string): value is DebtKind =>
  (DEBT_KINDS as readonly string[]).includes(value)
