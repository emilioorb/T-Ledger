import { z } from 'zod'
import { longText, nameText } from '../../../shared/http/text.schema.js'
import { isoDate, periodParam } from '../../../shared/http/date.schema.js'
import { CURRENCIES } from '../../../shared/kernel/currency.js'
import { moneySchema } from '../../../shared/http/money.schema.js'
import { paginationQuerySchema } from '../../../shared/http/pagination.js'
import { ACCOUNT_CLASSES } from '../domain/account-class.js'

const accountCode = z
  .string()
  .regex(/^\d{3,10}$/, { error: 'El código de cuenta debe ser numérico' })
const currency = z.enum(CURRENCIES)

// Un PATCH manda solo lo que cambia, así que lo que no viene tiene que llegar como
// `undefined` para que el caso de uso conserve el valor actual. Zod aplica los `.default()`
// también cuando la clave falta, incluso después de `.partial()`: por eso los campos se
// declaran sin valor por omisión y el esquema de creación los agrega, en vez de derivar el
// de actualización del de creación. Si no, renombrar borra todo lo que no se mandó.
const accountFields = {
  name: nameText,
  accountClass: z.enum(ACCOUNT_CLASSES),
  parentCode: accountCode.nullable(),
  active: z.boolean(),
  sortOrder: z.number().int(),
}

export const createAccountSchema = z
  .object({
    code: accountCode,
    ...accountFields,
    parentCode: accountFields.parentCode.default(null),
    active: accountFields.active.default(true),
    sortOrder: accountFields.sortOrder.default(0),
  })
  .meta({ id: 'CreateAccountInput', title: 'CreateAccountInput' })

export const updateAccountSchema = z
  .object(accountFields)
  .partial()
  .meta({ id: 'UpdateAccountInput', title: 'UpdateAccountInput' })

export const listAccountsQuerySchema = paginationQuerySchema
  .extend({
    accountClass: z.enum(ACCOUNT_CLASSES).optional(),
    active: z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .optional(),
  })
  .meta({ id: 'ListAccountsQuery', title: 'ListAccountsQuery' })

export const accountsTreeQuerySchema = z
  .object({ currency, at: isoDate })
  .meta({ id: 'AccountsTreeQuery', title: 'AccountsTreeQuery' })

// Diez colores, numerados desde uno. El contrato valida el rango porque un número fuera de él
// pintaría con una variable CSS que no existe, y eso no se ve como un error: se ve como un
// punto transparente.
export const COLORES = 10
const colorIndex = z.number().int().min(1).max(COLORES).nullable()

const categoryFields = {
  name: nameText,
  kind: z.enum(['EXPENSE', 'INCOME']),
  accountCode: accountCode.nullable(),
  sortOrder: z.number().int(),
  active: z.boolean(),
  colorIndex,
}

export const createCategorySchema = z
  .object({
    ...categoryFields,
    accountCode: categoryFields.accountCode.default(null),
    sortOrder: categoryFields.sortOrder.default(0),
    active: categoryFields.active.default(true),
    colorIndex: categoryFields.colorIndex.default(null),
  })
  .meta({ id: 'CreateCategoryInput', title: 'CreateCategoryInput' })

export const updateCategorySchema = z
  .object(categoryFields)
  .partial()
  .meta({ id: 'UpdateCategoryInput', title: 'UpdateCategoryInput' })

const movementFields = {
  date: isoDate,
  kind: z.enum(['EXPENSE', 'INCOME']),
  categoryId: z.string().min(1),
  counterparty: nameText,
  amount: moneySchema,
  paymentAccountCode: accountCode.nullable(),
}

// El comprobante no está acá a propósito: no se manda en el cuerpo del movimiento. La clave
// del archivo la arma el servidor al subirlo, y aceptarla desde afuera sería dejar que alguien
// apunte un movimiento suyo al comprobante de otro libro con solo escribir su clave.

export const createMovementSchema = z
  .object({
    ...movementFields,
    paymentAccountCode: movementFields.paymentAccountCode.default(null),
  })
  .meta({ id: 'CreateMovementInput', title: 'CreateMovementInput' })

// La versión que se leyó. Opcional mientras haya clientes que no la mandan: sin ella se guarda
// como antes, y queda contado.
const version = z.number().int().nonnegative()

export const updateMovementSchema = z
  .object({ ...movementFields, version })
  .partial()
  .meta({ id: 'UpdateMovementInput', title: 'UpdateMovementInput' })

// Sin cuerpo también vale: es lo que manda la app instalada que todavía no se actualizó.
export const voidMovementSchema = z
  .object({ version })
  .partial()
  .default({})
  .meta({ id: 'VoidMovementInput', title: 'VoidMovementInput' })

export const listMovementsQuerySchema = paginationQuerySchema
  .extend({
    kind: z.enum(['EXPENSE', 'INCOME']).optional(),
    status: z.enum(['ACTIVE', 'VOIDED']).optional(),
    categoryId: z.string().min(1).optional(),
    from: isoDate.optional(),
    to: isoDate.optional(),
    search: nameText.optional(),
  })
  .meta({ id: 'ListMovementsQuery', title: 'ListMovementsQuery' })

// Los mismos filtros que la lista, sin paginación: un resumen de una página no resume nada.
export const movementTotalsQuerySchema = listMovementsQuerySchema
  .omit({ page: true, pageSize: true })
  .meta({ id: 'MovementTotalsQuery', title: 'MovementTotalsQuery' })

export const createJournalEntrySchema = z
  .object({
    date: isoDate,
    description: longText,
    reference: nameText.nullable().default(null),
    lines: z
      .array(
        z.object({
          accountCode,
          amount: moneySchema,
          side: z.enum(['DEBIT', 'CREDIT']),
        }),
      )
      .min(2)
      // Un asiento con miles de líneas no es un asiento: es una importación mal hecha.
      .max(100),
  })
  .meta({ id: 'CreateJournalEntryInput', title: 'CreateJournalEntryInput' })

export const listJournalEntriesQuerySchema = paginationQuerySchema
  .extend({ from: isoDate, to: isoDate })
  .meta({ id: 'ListJournalEntriesQuery', title: 'ListJournalEntriesQuery' })

const rangeReportQuery = z.object({ currency, from: isoDate, to: isoDate })

export const ledgerQuerySchema = rangeReportQuery
  .extend({ account: accountCode })
  .meta({ id: 'LedgerQuery', title: 'LedgerQuery' })

export const trialBalanceQuerySchema = rangeReportQuery
  .extend({ format: z.enum(['json', 'csv']).default('json') })
  .meta({ id: 'TrialBalanceQuery', title: 'TrialBalanceQuery' })

export const incomeStatementQuerySchema = rangeReportQuery.meta({
  id: 'IncomeStatementQuery',
  title: 'IncomeStatementQuery',
})

export const financialPositionQuerySchema = z
  .object({ currency, at: isoDate })
  .meta({ id: 'FinancialPositionQuery', title: 'FinancialPositionQuery' })

// Sin moneda: consolidar es justamente no elegir una.
export const netWorthQuerySchema = z
  .object({ at: isoDate })
  .meta({ id: 'NetWorthQuery', title: 'NetWorthQuery' })

export const periodParamSchema = z
  .object({ period: periodParam })
  .meta({ id: 'PeriodParam', title: 'PeriodParam' })

export type CreateAccountInput = z.infer<typeof createAccountSchema>
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>
export type ListAccountsQuery = z.infer<typeof listAccountsQuerySchema>
export type AccountsTreeQuery = z.infer<typeof accountsTreeQuerySchema>
export type CreateCategoryInput = z.infer<typeof createCategorySchema>
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>
export type CreateMovementInput = z.infer<typeof createMovementSchema>
export type UpdateMovementInput = z.infer<typeof updateMovementSchema>
export type VoidMovementInput = z.infer<typeof voidMovementSchema>
export type ListMovementsQuery = z.infer<typeof listMovementsQuerySchema>
export type MovementTotalsQuery = z.infer<typeof movementTotalsQuerySchema>
export type CreateJournalEntryInput = z.infer<typeof createJournalEntrySchema>
export type ListJournalEntriesQuery = z.infer<typeof listJournalEntriesQuerySchema>
export type LedgerQuery = z.infer<typeof ledgerQuerySchema>
export type TrialBalanceQuery = z.infer<typeof trialBalanceQuerySchema>
export type IncomeStatementQuery = z.infer<typeof incomeStatementQuerySchema>
export type FinancialPositionQuery = z.infer<typeof financialPositionQuerySchema>
export type NetWorthQuery = z.infer<typeof netWorthQuerySchema>
