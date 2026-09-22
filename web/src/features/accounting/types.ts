import type { components } from '@/lib/api-types.gen'

// Ningún tipo de respuesta se declara a mano: todos salen del OpenAPI generado.
export type Money = components['schemas']['Money']
export type Account = components['schemas']['Account']
export type AccountInput = components['schemas']['CreateAccountInput']
export type AccountPatch = components['schemas']['UpdateAccountInput']
export type ReportNode = components['schemas']['ReportNode']
export type Category = components['schemas']['Category']
export type CategoryInput = components['schemas']['CreateCategoryInput']
export type CategoryPatch = components['schemas']['UpdateCategoryInput']
export type Movement = components['schemas']['Movement']
export type CategoryTotal = components['schemas']['CategoryTotal']
export type MovementInput = components['schemas']['CreateMovementInput']
export type MovementPatch = components['schemas']['UpdateMovementInput']
export type JournalEntry = components['schemas']['JournalEntry']
export type JournalEntryInput = components['schemas']['CreateJournalEntryInput']
export type TrialBalance = components['schemas']['TrialBalance']
export type GeneralLedger = components['schemas']['GeneralLedger']
export type FinancialPosition = components['schemas']['FinancialPosition']
export type IncomeStatement = components['schemas']['IncomeStatement']
export type NetWorth = components['schemas']['NetWorth']
export type CurrencyBreakdown = NetWorth['byCurrency'][number]
export type PeriodSummary = components['schemas']['PeriodSummary']
export type AccountingPeriod = components['schemas']['AccountingPeriod']

export type AccountClass = Account['accountClass']
export type CategoryKind = Category['kind']
export type MovementStatus = Movement['status']
export type EntrySide = JournalEntry['lines'][number]['side']
export type CurrencyCode = Money['currency']

export interface Paginated<T> {
  data: T[]
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number }
}

export interface MovementFilters {
  kind?: CategoryKind
  status?: MovementStatus
  categoryId?: string
  from?: string
  to?: string
}
