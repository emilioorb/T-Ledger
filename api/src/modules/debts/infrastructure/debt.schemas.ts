import { z } from 'zod'
import { moneySchema } from '../../../shared/http/money.schema.js'
import { DEBT_KINDS } from '../domain/debt-kind.js'

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: 'La fecha debe ser AAAA-MM-DD' })

export const createDebtSchema = z
  .object({
    name: z.string().trim().min(1),
    counterparty: z.string().trim().min(1),
    principal: moneySchema,
    annualRate: z.string().regex(/^\d+(\.\d+)?$/, { error: 'La tasa debe ser un decimal no negativo' }),
    compounding: z.enum(['MONTHLY', 'ANNUAL']),
    termMonths: z.number().int().positive(),
    startDate: isoDate,
    kind: z.enum(DEBT_KINDS),
    direction: z.enum(['BORROWED', 'LENT']),
    budgetBucket: z.string().trim().min(1).nullable(),
  })
  .meta({ id: 'CreateDebtInput', title: 'CreateDebtInput' })

export const updateDebtSchema = createDebtSchema.partial().meta({ id: 'UpdateDebtInput', title: 'UpdateDebtInput' })

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
