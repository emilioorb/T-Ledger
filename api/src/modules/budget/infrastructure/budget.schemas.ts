import { z } from 'zod'
import { CURRENCIES } from '../../../shared/kernel/currency.js'
import { moneySchema } from '../../../shared/http/money.schema.js'

const periodParam = z.string().regex(/^\d{4}-\d{2}$/, { error: 'El período debe ser AAAA-MM' })
const accountCode = z.string().regex(/^\d{3,10}$/, { error: 'El código de cuenta debe ser numérico' })
const percentage = z
  .string()
  .regex(/^\d+(\.\d+)?$/, { error: 'El porcentaje debe ser un decimal no negativo' })

export const budgetBucketSchema = z
  .object({
    id: z.string().trim().min(1),
    name: z.string().trim().min(1),
    percentage,
    isSavings: z.boolean().default(false),
    accountCodes: z.array(accountCode).default([]),
  })
  .meta({ id: 'BudgetBucketInput', title: 'BudgetBucketInput' })

export const budgetModelSchema = z
  .object({
    name: z.string().trim().min(1),
    active: z.boolean().default(false),
    buckets: z.array(budgetBucketSchema).min(1),
  })
  .meta({ id: 'BudgetModelInput', title: 'BudgetModelInput' })

export const evaluationQuerySchema = z
  .object({ month: periodParam, currency: z.enum(CURRENCIES) })
  .meta({ id: 'BudgetEvaluationQuery', title: 'BudgetEvaluationQuery' })

export const monthlyIncomeSchema = z
  .object({ amount: moneySchema })
  .meta({ id: 'MonthlyIncomeInput', title: 'MonthlyIncomeInput' })

export const budgetModelResponseSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    active: z.boolean(),
    buckets: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        percentage: z.string(),
        isSavings: z.boolean(),
        accountCodes: z.array(z.string()),
      }),
    ),
  })
  .meta({ id: 'BudgetModelResponse', title: 'BudgetModelResponse' })

export const budgetEvaluationResponseSchema = z
  .object({
    modelId: z.string(),
    modelName: z.string(),
    period: z.string(),
    income: moneySchema,
    incomeDeclared: z.boolean(),
    totalConsumed: moneySchema,
    surplus: moneySchema,
    buckets: z.array(
      z.object({
        bucketId: z.string(),
        name: z.string(),
        allocated: moneySchema,
        consumed: moneySchema,
        deviation: moneySchema,
        status: z.enum(['UNDER', 'ON_TRACK', 'OVER']),
      }),
    ),
  })
  .meta({ id: 'BudgetEvaluation', title: 'BudgetEvaluation' })

export const monthlyIncomeResponseSchema = z
  .object({ period: z.string(), amount: moneySchema })
  .meta({ id: 'MonthlyIncome', title: 'MonthlyIncome' })

export type BudgetModelInput = z.infer<typeof budgetModelSchema>
export type EvaluationQuery = z.infer<typeof evaluationQuerySchema>
export type MonthlyIncomeInput = z.infer<typeof monthlyIncomeSchema>
