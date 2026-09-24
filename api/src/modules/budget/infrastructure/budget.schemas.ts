import { z } from 'zod'
import { version } from '../../../shared/http/version.schema.js'
import { periodParam } from '../../../shared/http/date.schema.js'
import { nameText } from '../../../shared/http/text.schema.js'
import { CURRENCIES } from '../../../shared/kernel/currency.js'
import { moneySchema, nonNegativeMoneySchema } from '../../../shared/http/money.schema.js'

const accountCode = z
  .string()
  .regex(/^\d{3,10}$/, { error: 'El código de cuenta debe ser numérico' })
const percentage = z
  .string()
  .regex(/^\d+(\.\d+)?$/, { error: 'El porcentaje debe ser un decimal no negativo' })

// El mismo rango que en categorías: diez colores numerados desde uno. `null` es «el que le
// toque por su lugar», que es como se pintaban antes de que se pudieran elegir.
const colorIndex = z.number().int().min(1).max(10).nullable().default(null)

export const budgetBucketSchema = z
  .object({
    id: nameText,
    name: nameText,
    percentage,
    isSavings: z.boolean().default(false),
    accountCodes: z.array(accountCode).default([]),
    colorIndex,
  })
  .meta({ id: 'BudgetBucketInput', title: 'BudgetBucketInput' })

export const budgetModelSchema = z
  .object({
    name: nameText,
    active: z.boolean().default(false),
    buckets: z.array(budgetBucketSchema).min(1),
  })
  .meta({ id: 'BudgetModelInput', title: 'BudgetModelInput' })

// Editar manda la versión que leyó, opcional mientras haya clientes que no la mandan.
export const updateBudgetModelSchema = budgetModelSchema
  .extend({ version: version.optional() })
  .meta({ id: 'UpdateBudgetModelInput', title: 'UpdateBudgetModelInput' })

export const evaluationQuerySchema = z
  .object({ month: periodParam, currency: z.enum(CURRENCIES) })
  .meta({ id: 'BudgetEvaluationQuery', title: 'BudgetEvaluationQuery' })

export const monthlyIncomeSchema = z
  .object({ amount: nonNegativeMoneySchema, version: version.optional() })
  .meta({ id: 'MonthlyIncomeInput', title: 'MonthlyIncomeInput' })

export const budgetModelResponseSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    active: z.boolean(),
    // La que hay que mandar al editar: si no coincide con la de la base, 409.
    version: z.number().int(),
    buckets: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        percentage: z.string(),
        isSavings: z.boolean(),
        accountCodes: z.array(z.string()),
        colorIndex: z.number().nullable(),
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
  .object({ period: z.string(), amount: moneySchema, version: z.number().int() })
  .meta({ id: 'MonthlyIncome', title: 'MonthlyIncome' })

export type BudgetModelInput = z.infer<typeof budgetModelSchema>
export type UpdateBudgetModelInput = z.infer<typeof updateBudgetModelSchema>
export type EvaluationQuery = z.infer<typeof evaluationQuerySchema>
export type MonthlyIncomeInput = z.infer<typeof monthlyIncomeSchema>
