import { z } from 'zod'
import { moneySchema } from '../../../shared/http/money.schema.js'

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: 'La fecha debe ser AAAA-MM-DD' })
const accountCode = z.string().regex(/^\d{3,10}$/, { error: 'El código de cuenta debe ser numérico' })

export const createInvestmentSchema = z
  .object({
    name: z.string().trim().min(1),
    principal: moneySchema,
    annualRate: z.string().regex(/^\d+(\.\d+)?$/, { error: 'La tasa debe ser un decimal no negativo' }),
    compounding: z.enum(['MONTHLY', 'ANNUAL']),
    openedAt: isoDate,
    kind: z.enum(['FIXED_TERM', 'OPEN']),
    maturesAt: isoDate.nullable().default(null),
    accountCode: accountCode.nullable().default(null),
  })
  .meta({ id: 'CreateInvestmentInput', title: 'CreateInvestmentInput' })

export const updateInvestmentSchema = createInvestmentSchema
  .partial()
  .meta({ id: 'UpdateInvestmentInput', title: 'UpdateInvestmentInput' })

export const investmentContributionSchema = z
  .object({ date: isoDate, amount: moneySchema })
  .meta({ id: 'InvestmentContributionInput', title: 'InvestmentContributionInput' })

export const projectionQuerySchema = z
  .object({ at: isoDate })
  .meta({ id: 'InvestmentProjectionQuery', title: 'InvestmentProjectionQuery' })

export const investmentResponseSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    principal: moneySchema,
    annualRate: z.string(),
    compounding: z.enum(['MONTHLY', 'ANNUAL']),
    openedAt: isoDate,
    kind: z.enum(['FIXED_TERM', 'OPEN']),
    maturesAt: isoDate.nullable(),
    accountCode: z.string().nullable(),
    invested: moneySchema,
    value: moneySchema,
    interestEarned: moneySchema,
    matured: z.boolean(),
    contributions: z.array(z.object({ id: z.string(), date: isoDate, amount: moneySchema })),
  })
  .meta({ id: 'Investment', title: 'Investment' })

export type CreateInvestmentInput = z.infer<typeof createInvestmentSchema>
export type UpdateInvestmentInput = z.infer<typeof updateInvestmentSchema>
export type InvestmentContributionInput = z.infer<typeof investmentContributionSchema>
export type ProjectionQuery = z.infer<typeof projectionQuerySchema>
