import { z } from 'zod'
import { CURRENCIES } from '../../../shared/kernel/currency.js'
import { moneySchema } from '../../../shared/http/money.schema.js'
import { paginationQuerySchema } from '../../../shared/http/pagination.js'
import { ACCOUNT_CLASSES } from '../domain/account-class.js'

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: 'La fecha debe ser AAAA-MM-DD' })
const periodParam = z.string().regex(/^\d{4}-\d{2}$/, { error: 'El período debe ser AAAA-MM' })
const accountCode = z.string().regex(/^\d{3,10}$/, { error: 'El código de cuenta debe ser numérico' })
const currency = z.enum(CURRENCIES)

export const createAccountSchema = z
  .object({
    code: accountCode,
    name: z.string().trim().min(1),
    accountClass: z.enum(ACCOUNT_CLASSES),
    parentCode: accountCode.nullable().default(null),
    active: z.boolean().default(true),
    sortOrder: z.number().int().default(0),
  })
  .meta({ id: 'CreateAccountInput', title: 'CreateAccountInput' })

export const updateAccountSchema = createAccountSchema
  .omit({ code: true })
  .partial()
  .meta({ id: 'UpdateAccountInput', title: 'UpdateAccountInput' })

export const listAccountsQuerySchema = paginationQuerySchema
  .extend({
    accountClass: z.enum(ACCOUNT_CLASSES).optional(),
    active: z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .optional(),
  })
  .meta({ id: 'ListAccountsQuery', title: 'ListAccountsQuery' })

export const accountsTreeQuerySchema = z
  .object({ currency, at: isoDate })
  .meta({ id: 'AccountsTreeQuery', title: 'AccountsTreeQuery' })

export const createCategorySchema = z
  .object({
    name: z.string().trim().min(1),
    kind: z.enum(['EXPENSE', 'INCOME']),
    accountCode: accountCode.nullable().default(null),
    sortOrder: z.number().int().default(0),
    active: z.boolean().default(true),
  })
  .meta({ id: 'CreateCategoryInput', title: 'CreateCategoryInput' })

export const updateCategorySchema = createCategorySchema
  .partial()
  .meta({ id: 'UpdateCategoryInput', title: 'UpdateCategoryInput' })

export const createMovementSchema = z
  .object({
    date: isoDate,
    kind: z.enum(['EXPENSE', 'INCOME']),
    categoryId: z.string().min(1),
    counterparty: z.string().trim().min(1),
    amount: moneySchema,
    paymentAccountCode: accountCode.nullable().default(null),
    receiptUrl: z.string().trim().min(1).nullable().default(null),
  })
  .meta({ id: 'CreateMovementInput', title: 'CreateMovementInput' })

export const updateMovementSchema = createMovementSchema
  .partial()
  .meta({ id: 'UpdateMovementInput', title: 'UpdateMovementInput' })

export const listMovementsQuerySchema = paginationQuerySchema
  .extend({
    kind: z.enum(['EXPENSE', 'INCOME']).optional(),
    status: z.enum(['ACTIVE', 'VOIDED']).optional(),
    categoryId: z.string().min(1).optional(),
    from: isoDate.optional(),
    to: isoDate.optional(),
    search: z.string().trim().min(1).optional(),
  })
  .meta({ id: 'ListMovementsQuery', title: 'ListMovementsQuery' })

export const createJournalEntrySchema = z
  .object({
    date: isoDate,
    description: z.string().trim().min(1),
    reference: z.string().trim().min(1).nullable().default(null),
    lines: z
      .array(
        z.object({
          accountCode,
          amount: moneySchema,
          side: z.enum(['DEBIT', 'CREDIT']),
        }),
      )
      .min(2),
  })
  .meta({ id: 'CreateJournalEntryInput', title: 'CreateJournalEntryInput' })

export const listJournalEntriesQuerySchema = paginationQuerySchema
  .extend({ from: isoDate, to: isoDate })
  .meta({ id: 'ListJournalEntriesQuery', title: 'ListJournalEntriesQuery' })

const rangeReportQuery = z.object({ currency, from: isoDate, to: isoDate })

export const ledgerQuerySchema = rangeReportQuery
  .extend({ account: accountCode })
  .meta({ id: 'LedgerQuery', title: 'LedgerQuery' })

export const trialBalanceQuerySchema = rangeReportQuery
  .extend({ format: z.enum(['json', 'csv']).default('json') })
  .meta({ id: 'TrialBalanceQuery', title: 'TrialBalanceQuery' })

export const incomeStatementQuerySchema = rangeReportQuery.meta({
  id: 'IncomeStatementQuery',
  title: 'IncomeStatementQuery',
})

export const financialPositionQuerySchema = z
  .object({ currency, at: isoDate })
  .meta({ id: 'FinancialPositionQuery', title: 'FinancialPositionQuery' })

// Sin moneda: consolidar es justamente no elegir una.
export const netWorthQuerySchema = z
  .object({ at: isoDate })
  .meta({ id: 'NetWorthQuery', title: 'NetWorthQuery' })

export const periodParamSchema = z
  .object({ period: periodParam })
  .meta({ id: 'PeriodParam', title: 'PeriodParam' })

export type CreateAccountInput = z.infer<typeof createAccountSchema>
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>
export type ListAccountsQuery = z.infer<typeof listAccountsQuerySchema>
export type AccountsTreeQuery = z.infer<typeof accountsTreeQuerySchema>
export type CreateCategoryInput = z.infer<typeof createCategorySchema>
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>
export type CreateMovementInput = z.infer<typeof createMovementSchema>
export type UpdateMovementInput = z.infer<typeof updateMovementSchema>
export type ListMovementsQuery = z.infer<typeof listMovementsQuerySchema>
export type CreateJournalEntryInput = z.infer<typeof createJournalEntrySchema>
export type ListJournalEntriesQuery = z.infer<typeof listJournalEntriesQuerySchema>
export type LedgerQuery = z.infer<typeof ledgerQuerySchema>
export type TrialBalanceQuery = z.infer<typeof trialBalanceQuerySchema>
export type IncomeStatementQuery = z.infer<typeof incomeStatementQuerySchema>
export type FinancialPositionQuery = z.infer<typeof financialPositionQuerySchema>
export type NetWorthQuery = z.infer<typeof netWorthQuerySchema>
