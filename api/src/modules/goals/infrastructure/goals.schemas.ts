import { z } from 'zod'
import { moneySchema } from '../../../shared/http/money.schema.js'

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: 'La fecha debe ser AAAA-MM-DD' })
const accountCode = z.string().regex(/^\d{3,10}$/, { error: 'El código de cuenta debe ser numérico' })

export const createGoalSchema = z
  .object({
    name: z.string().trim().min(1),
    target: moneySchema,
    desiredDate: isoDate,
    priority: z.number().int().min(0).default(0),
    accountCode: accountCode.nullable().default(null),
  })
  .meta({ id: 'CreateGoalInput', title: 'CreateGoalInput' })

export const updateGoalSchema = createGoalSchema
  .partial()
  .meta({ id: 'UpdateGoalInput', title: 'UpdateGoalInput' })

export const createContributionSchema = z
  .object({ date: isoDate, amount: moneySchema })
  .meta({ id: 'CreateContributionInput', title: 'CreateContributionInput' })

export const goalResponseSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    target: moneySchema,
    desiredDate: isoDate,
    priority: z.number(),
    accountCode: z.string().nullable(),
    contributed: moneySchema,
    remaining: moneySchema,
    progress: z.string(),
    reached: z.boolean(),
    requiredMonthlyContribution: moneySchema,
    observedMonthlyPace: moneySchema.nullable(),
    projectedDate: isoDate.nullable(),
    onTrack: z.boolean(),
    contributions: z.array(z.object({ id: z.string(), date: isoDate, amount: moneySchema })),
  })
  .meta({ id: 'Goal', title: 'Goal' })

export type CreateGoalInput = z.infer<typeof createGoalSchema>
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>
export type CreateContributionInput = z.infer<typeof createContributionSchema>
