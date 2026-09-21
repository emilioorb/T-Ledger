import { z } from 'zod'
import { annualRate, nameText } from '../../../shared/http/text.schema.js'
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
const investmentFields = {
  name: nameText,
  principal: moneySchema,
  annualRate,
  compounding: z.enum(['MONTHLY', 'ANNUAL']),
  openedAt: isoDate,
  kind: z.enum(['FIXED_TERM', 'OPEN']),
  maturesAt: isoDate.nullable(),
  accountCode: accountCode.nullable(),
}

export const createInvestmentSchema = z
  .object({
    ...investmentFields,
    maturesAt: investmentFields.maturesAt.default(null),
    accountCode: investmentFields.accountCode.default(null),
  })
  .meta({ id: 'CreateInvestmentInput', title: 'CreateInvestmentInput' })

export const updateInvestmentSchema = z
  .object(investmentFields)
  .partial()
  .meta({ id: 'UpdateInvestmentInput', title: 'UpdateInvestmentInput' })

// Agregar capital no es ganar plata: sale de una cuenta tuya y entra a la inversión. Por eso
// pide de dónde sale, igual que un aporte a una meta.
export const investmentContributionSchema = z
  .object({ date: isoDate, amount: moneySchema, fromAccountCode: accountCode })
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
