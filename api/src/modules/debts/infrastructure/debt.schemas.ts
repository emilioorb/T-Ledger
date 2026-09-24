import { z } from 'zod'
import { version } from '../../../shared/http/version.schema.js'
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
    // Opcional y no con valor por omisión: con `.default()` el contrato generado la marca como
    // obligatoria para quien crea una deuda, y nadie tiene notas al crearla.
    notes: z.string().max(20_000).nullable().optional(),
  })
  .meta({ id: 'CreateDebtInput', title: 'CreateDebtInput' })

export const updateDebtSchema = createDebtSchema
  .extend({ version })
  .partial()
  .meta({ id: 'UpdateDebtInput', title: 'UpdateDebtInput' })

// `at` mira el saldo a una fecha y por omisión es hoy. Existe para poder comparar contra
// el cierre del mes pasado sin pedir la tabla de amortización de cada deuda por separado.
export const listDebtsQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(20),
    direction: z.enum(['BORROWED', 'LENT']).optional(),
    at: isoDate.optional(),
  })
  .meta({ id: 'ListDebtsQuery', title: 'ListDebtsQuery' })

export const debtResponseSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    counterparty: z.string(),
    principal: moneySchema,
    // Lo que falta pagar a la fecha consultada. `principal` es el monto original y no baja
    // nunca: son dos datos distintos y los dos hacen falta.
    outstanding: moneySchema,
    annualRate: z.string(),
    compounding: z.enum(['MONTHLY', 'ANNUAL']),
    termMonths: z.number(),
    startDate: isoDate,
    kind: z.enum(DEBT_KINDS),
    direction: z.enum(['BORROWED', 'LENT']),
    budgetBucket: z.string().nullable(),
    notes: z.string().nullable(),
    // Si tiene contrato adjunto. La clave no sale: se pide el enlace firmado a `/document`.
    hasDocument: z.boolean(),
    // La que hay que mandar al editar, pagar o borrar: si no coincide con la de la base, 409.
    version: z.number().int(),
    monthlyPayment: moneySchema,
    totalInterest: moneySchema,
    payoffDate: isoDate,
  })
  .meta({ id: 'Debt', title: 'Debt' })

export type CreateDebtInput = z.infer<typeof createDebtSchema>
export type UpdateDebtInput = z.infer<typeof updateDebtSchema>
export type ListDebtsQuery = z.infer<typeof listDebtsQuerySchema>
export type DebtResponse = z.infer<typeof debtResponseSchema>
