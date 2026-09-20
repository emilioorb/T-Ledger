import { z } from 'zod'
import { moneySchema } from '../../../shared/http/money.schema.js'

export const installmentSchema = z
  .object({
    number: z.number().int().positive(),
    dueDate: z.string(),
    payment: moneySchema,
    principal: moneySchema,
    interest: moneySchema,
    balance: moneySchema,
  })
  .meta({ id: 'Installment', title: 'Installment' })

export const scheduleResponseSchema = z
  .object({
    installments: z.array(installmentSchema),
    totalInterest: moneySchema,
    totalPaid: moneySchema,
  })
  .meta({ id: 'AmortizationSchedule', title: 'AmortizationSchedule' })

export const simulateExtraPaymentSchema = z
  .object({
    amount: moneySchema,
    afterInstallment: z.number().int().positive(),
    mode: z.enum(['REDUCE_TERM', 'REDUCE_PAYMENT']),
  })
  .meta({ id: 'SimulateExtraPaymentInput', title: 'SimulateExtraPaymentInput' })

export const projectionResponseSchema = z
  .object({
    baseline: scheduleResponseSchema,
    withExtraPayment: scheduleResponseSchema,
    extraPayment: moneySchema,
    interestSaved: moneySchema,
    monthsSaved: z.number().int(),
    totalPaidWithExtra: moneySchema,
  })
  .meta({ id: 'ExtraPaymentProjection', title: 'ExtraPaymentProjection' })

export const payoffPlanQuerySchema = z
  .object({
    strategy: z.enum(['avalanche', 'snowball', 'manual']).default('avalanche'),
    order: z.string().optional(),
  })
  .meta({ id: 'PayoffPlanQuery', title: 'PayoffPlanQuery' })

export const payoffPlanResponseSchema = z
  .object({
    strategy: z.enum(['avalanche', 'snowball', 'manual']),
    order: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        balance: moneySchema,
        annualRate: z.string(),
        monthlyPayment: moneySchema,
      }),
    ),
  })
  .meta({ id: 'PayoffPlan', title: 'PayoffPlan' })

export type SimulateExtraPaymentInput = z.infer<typeof simulateExtraPaymentSchema>
export type PayoffPlanQuery = z.infer<typeof payoffPlanQuerySchema>
export type ScheduleResponse = z.infer<typeof scheduleResponseSchema>
export type ProjectionResponse = z.infer<typeof projectionResponseSchema>
export type PayoffPlanResponse = z.infer<typeof payoffPlanResponseSchema>
