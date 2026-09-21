import { z } from 'zod'
import { annualRate, nameText, termMonths } from '../../../shared/http/text.schema.js'
import { isoDate } from '../../../shared/http/date.schema.js'
import { moneySchema } from '../../../shared/http/money.schema.js'
import { DEBT_KINDS } from '../domain/debt-kind.js'

export const createDebtSchema = z
  .object({
    name: nameText,
    counterparty: nameText,
    principal: moneySchema,
    annualRate,
    compounding: z.enum(['MONTHLY', 'ANNUAL']),
    termMonths,
    startDate: isoDate,
    kind: z.enum(DEBT_KINDS),
    direction: z.enum(['BORROWED', 'LENT']),
    budgetBucket: nameText.nullable(),
  })
  .meta({ id: 'CreateDebtInput', title: 'CreateDebtInput' })

export const updateDebtSchema = createDebtSchema
  .partial()
  .meta({ id: 'UpdateDebtInput', title: 'UpdateDebtInput' })

export const listDebtsQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(20),
    direction: z.enum(['BORROWED', 'LENT']).optional(),
  })
  .meta({ id: 'ListDebtsQuery', title: 'ListDebtsQuery' })

export const debtResponseSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    counterparty: z.string(),
    principal: moneySchema,
    annualRate: z.string(),
    compounding: z.enum(['MONTHLY', 'ANNUAL']),
    termMonths: z.number(),
    startDate: isoDate,
    kind: z.enum(DEBT_KINDS),
    direction: z.enum(['BORROWED', 'LENT']),
    budgetBucket: z.string().nullable(),
    monthlyPayment: moneySchema,
    totalInterest: moneySchema,
    payoffDate: isoDate,
  })
  .meta({ id: 'Debt', title: 'Debt' })

export type CreateDebtInput = z.infer<typeof createDebtSchema>
export type UpdateDebtInput = z.infer<typeof updateDebtSchema>
export type ListDebtsQuery = z.infer<typeof listDebtsQuerySchema>
export type DebtResponse = z.infer<typeof debtResponseSchema>
