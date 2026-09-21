export const ACCOUNT_CLASSES = [
  'ASSET',
  'LIABILITY',
  'EQUITY',
  'INCOME',
  'COST_OF_REVENUE',
  'OPERATING_EXPENSE',
] as const

export type AccountClass = (typeof ACCOUNT_CLASSES)[number]

export type NormalBalance = 'DEBIT' | 'CREDIT'

const NORMAL_BALANCE: Record<AccountClass, NormalBalance> = {
  ASSET: 'DEBIT',
  LIABILITY: 'CREDIT',
  EQUITY: 'CREDIT',
  INCOME: 'CREDIT',
  COST_OF_REVENUE: 'DEBIT',
  OPERATING_EXPENSE: 'DEBIT',
}

const ROOT_CODE: Record<AccountClass, string> = {
  ASSET: '1000',
  LIABILITY: '2000',
  EQUITY: '3000',
  INCOME: '4000',
  COST_OF_REVENUE: '5000',
  OPERATING_EXPENSE: '6000',
}

// Las clases que forman el resultado del período. Su saldo no va al estado de situación:
// va al estado de resultados, y su neto entra a patrimonio como línea derivada.
const RESULT_CLASSES: ReadonlySet<AccountClass> = new Set([
  'INCOME',
  'COST_OF_REVENUE',
  'OPERATING_EXPENSE',
])

export const normalBalanceOf = (accountClass: AccountClass): NormalBalance =>
  NORMAL_BALANCE[accountClass]

export const rootCodeOf = (accountClass: AccountClass): string => ROOT_CODE[accountClass]

export const isResultClass = (accountClass: AccountClass): boolean =>
  RESULT_CLASSES.has(accountClass)

export const isAccountClass = (value: string): value is AccountClass =>
  (ACCOUNT_CLASSES as readonly string[]).includes(value)
