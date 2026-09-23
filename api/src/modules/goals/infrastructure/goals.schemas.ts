import { z } from 'zod'
import { nameText } from '../../../shared/http/text.schema.js'
import { isoDate } from '../../../shared/http/date.schema.js'
import { moneySchema } from '../../../shared/http/money.schema.js'

const accountCode = z
  .string()
  .regex(/^\d{3,10}$/, { error: 'El código de cuenta debe ser numérico' })

// Un PATCH manda solo lo que cambia, así que lo que no viene tiene que llegar como
// `undefined` para que el caso de uso conserve el valor actual. Zod aplica los `.default()`
// también cuando la clave falta, incluso después de `.partial()`: por eso los campos se
// declaran sin valor por omisión y el esquema de creación los agrega, en vez de derivar el
// de actualización del de creación. Si no, renombrar borra todo lo que no se mandó.
const goalFields = {
  name: nameText,
  target: moneySchema,
  desiredDate: isoDate,
  priority: z.number().int().min(0),
  accountCode: accountCode.nullable(),
  active: z.boolean(),
}

export const createGoalSchema = z
  .object({
    ...goalFields,
    priority: goalFields.priority.default(0),
    accountCode: goalFields.accountCode.default(null),
    active: goalFields.active.default(true),
  })
  .meta({ id: 'CreateGoalInput', title: 'CreateGoalInput' })

export const updateGoalSchema = z
  .object(goalFields)
  .partial()
  .meta({ id: 'UpdateGoalInput', title: 'UpdateGoalInput' })

// El aporte no es un gasto: es un traslado de una cuenta tuya a la cuenta de ahorro de la
// meta. Por eso pide de dónde sale: sin eso el asiento no cuadra.
export const createContributionSchema = z
  .object({ date: isoDate, amount: moneySchema, fromAccountCode: accountCode })
  .meta({ id: 'CreateContributionInput', title: 'CreateContributionInput' })

export const goalResponseSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    target: moneySchema,
    desiredDate: isoDate,
    priority: z.number(),
    accountCode: z.string().nullable(),
    active: z.boolean(),
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
