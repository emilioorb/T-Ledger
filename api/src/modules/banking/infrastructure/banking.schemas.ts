import { z } from 'zod'
import { nameText } from '../../../shared/http/text.schema.js'
import { isoDate } from '../../../shared/http/date.schema.js'
import { CURRENCIES } from '../../../shared/kernel/currency.js'
import { moneySchema } from '../../../shared/http/money.schema.js'
import { paginationQuerySchema } from '../../../shared/http/pagination.js'
import { version } from '../../../shared/http/version.schema.js'

const accountCode = z
  .string()
  .regex(/^\d{3,10}$/, { error: 'El código de cuenta debe ser numérico' })
const columnIndex = z.number().int().min(0)

export const importProfileSchema = z
  .object({
    name: nameText,
    delimiter: z.string().length(1),
    encoding: z.enum(['utf-8', 'latin1']),
    headerRows: z.number().int().min(0).default(1),
    dateColumn: columnIndex,
    dateFormat: z.enum(['DD/MM/YYYY', 'YYYY-MM-DD']),
    descriptionColumn: columnIndex,
    referenceColumn: columnIndex.nullable().default(null),
    amountColumn: columnIndex.nullable().default(null),
    debitColumn: columnIndex.nullable().default(null),
    creditColumn: columnIndex.nullable().default(null),
    decimalSeparator: z.enum(['.', ',']),
    thousandsSeparator: z.string().length(1).nullable().default(null),
  })
  .meta({ id: 'ImportProfileInput', title: 'ImportProfileInput' })

export const bankAccountSchema = z
  .object({
    name: nameText,
    accountCode,
    currency: z.enum(CURRENCIES),
    profileId: z.string().min(1).nullable().default(null),
    active: z.boolean().default(true),
  })
  .meta({ id: 'BankAccountInput', title: 'BankAccountInput' })

// Editar manda la versión que leyó, opcional mientras haya clientes que no la mandan.
export const updateImportProfileSchema = importProfileSchema
  .extend({ version: version.optional() })
  .meta({ id: 'UpdateImportProfileInput', title: 'UpdateImportProfileInput' })

export const updateBankAccountSchema = bankAccountSchema
  .extend({ version: version.optional() })
  .meta({ id: 'UpdateBankAccountInput', title: 'UpdateBankAccountInput' })

export const importStatementSchema = z
  .object({ bankAccountId: z.string().min(1), profileId: z.string().min(1) })
  .meta({ id: 'ImportStatementInput', title: 'ImportStatementInput' })

export const reconciliationQuerySchema = paginationQuerySchema
  .extend({ from: isoDate, to: isoDate })
  .meta({ id: 'ReconciliationQuery', title: 'ReconciliationQuery' })

export const matchLineSchema = z
  .object({ movementId: z.string().min(1) })
  .meta({ id: 'MatchLineInput', title: 'MatchLineInput' })

export const lineToMovementSchema = z
  .object({
    categoryId: z.string().min(1),
    counterparty: nameText.optional(),
  })
  .meta({ id: 'LineToMovementInput', title: 'LineToMovementInput' })

export const bankAccountResponseSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    accountCode: z.string(),
    currency: z.enum(CURRENCIES),
    profileId: z.string().nullable(),
    active: z.boolean(),
    version: z.number().int(),
  })
  .meta({ id: 'BankAccount', title: 'BankAccount' })

export const importProfileResponseSchema = importProfileSchema
  .extend({ id: z.string(), version: z.number().int() })
  .meta({ id: 'ImportProfile', title: 'ImportProfile' })

export const bankLineResponseSchema = z
  .object({
    id: z.string(),
    date: isoDate,
    description: z.string(),
    reference: z.string().nullable(),
    amount: moneySchema,
    status: z.enum(['PENDING', 'MATCHED', 'IGNORED']),
    movementId: z.string().nullable(),
  })
  .meta({ id: 'BankLine', title: 'BankLine' })

export const parsedLineResponseSchema = z
  .object({
    date: isoDate,
    description: z.string(),
    reference: z.string().nullable(),
    amount: moneySchema,
  })
  .meta({ id: 'ParsedBankLine', title: 'ParsedBankLine' })

export const importResultResponseSchema = z
  .object({
    statementId: z.string(),
    fileName: z.string(),
    imported: z.number(),
    duplicated: z.number(),
  })
  .meta({ id: 'ImportResult', title: 'ImportResult' })

export const suggestionResponseSchema = z
  .object({
    lineId: z.string(),
    movementId: z.string(),
    score: z.number(),
    reason: z.enum(['EXACT', 'NEAR_DATE', 'REFERENCE']),
    ambiguous: z.boolean(),
  })
  .meta({ id: 'MatchSuggestion', title: 'MatchSuggestion' })

export const reconciliationResponseSchema = z
  .object({
    bankAccountId: z.string(),
    ledgerMovement: moneySchema,
    statementMovement: moneySchema,
    difference: moneySchema,
    lines: z.array(bankLineResponseSchema),
    pendingTotal: moneySchema,
    resolved: z.array(bankLineResponseSchema),
    suggestions: z.array(suggestionResponseSchema),
    pagination: z.object({
      page: z.number(),
      pageSize: z.number(),
      totalItems: z.number(),
      totalPages: z.number(),
    }),
  })
  .meta({ id: 'Reconciliation', title: 'Reconciliation' })

export type ImportProfileInput = z.infer<typeof importProfileSchema>
export type BankAccountInput = z.infer<typeof bankAccountSchema>
export type UpdateImportProfileInput = z.infer<typeof updateImportProfileSchema>
export type UpdateBankAccountInput = z.infer<typeof updateBankAccountSchema>
export type ImportStatementInput = z.infer<typeof importStatementSchema>
export type ReconciliationQuery = z.infer<typeof reconciliationQuerySchema>
export type MatchLineInput = z.infer<typeof matchLineSchema>
export type LineToMovementInput = z.infer<typeof lineToMovementSchema>
