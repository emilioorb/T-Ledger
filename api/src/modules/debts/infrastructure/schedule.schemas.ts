import { z } from 'zod'
import { isoDate } from '../../../shared/http/date.schema.js'
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

// La tabla de una deuda real, con lo que pasó en cada cuota. La de una simulación no lo lleva:
// ahí ninguna cuota se pagó todavía.
export const debtInstallmentSchema = installmentSchema
  .extend({
    status: z.enum(['PAID', 'OVERDUE', 'PENDING']),
    paidOn: z.string().nullable(),
    // Falso en una cuota pagada antes de llevar el libro: está saldada, pero sin gasto que la
    // respalde.
    withMovement: z.boolean(),
  })
  .meta({ id: 'DebtInstallment', title: 'DebtInstallment' })

export const debtScheduleResponseSchema = scheduleResponseSchema
  .extend({ installments: z.array(debtInstallmentSchema) })
  .meta({ id: 'DebtSchedule', title: 'DebtSchedule' })

export const pagarCuotaSchema = z
  .object({
    date: isoDate,
    paymentAccountCode: z.string().regex(/^\d{3,10}$/),
    categoryId: z.string().min(1),
  })
  .meta({ id: 'PagarCuotaInput', title: 'PagarCuotaInput' })

export const marcarCuotaPagadaSchema = z
  .object({ date: isoDate })
  .meta({ id: 'MarcarCuotaPagadaInput', title: 'MarcarCuotaPagadaInput' })

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
export type DebtScheduleResponse = z.infer<typeof debtScheduleResponseSchema>
export type PagarCuotaInput = z.infer<typeof pagarCuotaSchema>
export type MarcarCuotaPagadaInput = z.infer<typeof marcarCuotaPagadaSchema>
export type ProjectionResponse = z.infer<typeof projectionResponseSchema>
export type PayoffPlanResponse = z.infer<typeof payoffPlanResponseSchema>
