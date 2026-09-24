import { z } from 'zod'
import { moneySchema } from '../../../shared/http/money.schema.js'
import { ACCOUNT_CLASSES } from '../domain/account-class.js'

// Ningún tipo de respuesta se declara a mano en el frontend: sale de acá, por el OpenAPI.
export const accountResponseSchema = z
  .object({
    code: z.string(),
    name: z.string(),
    accountClass: z.enum(ACCOUNT_CLASSES),
    parentCode: z.string().nullable(),
    active: z.boolean(),
    sortOrder: z.number(),
    // La que hay que mandar al editar: si no coincide con la de la base, 409.
    version: z.number().int(),
  })
  .meta({ id: 'Account', title: 'Account' })

export interface ReportNodeResponse {
  code: string
  name: string
  balance: z.infer<typeof moneySchema>
  level: number
  children: ReportNodeResponse[]
}

// El árbol se define por recursión, y el id es lo que permite a zod-openapi emitir la
// referencia cíclica en vez de quedarse sin fondo.
export const reportNodeSchema: z.ZodType<ReportNodeResponse> = z
  .object({
    code: z.string(),
    name: z.string(),
    balance: moneySchema,
    level: z.number(),
    children: z.array(z.lazy(() => reportNodeSchema)),
  })
  .meta({ id: 'ReportNode', title: 'ReportNode' })

export const categoryResponseSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    kind: z.enum(['EXPENSE', 'INCOME']),
    accountCode: z.string().nullable(),
    sortOrder: z.number(),
    active: z.boolean(),
    // Cuál de los diez colores, por número. `null` cuando no se eligió: la pantalla le da el
    // que le toca, y así una categoría sin color no se ve rota, se ve sin elegir.
    colorIndex: z.number().nullable(),
    version: z.number().int(),
    postable: z.boolean(),
  })
  .meta({ id: 'Category', title: 'Category' })

export const movementResponseSchema = z
  .object({
    id: z.string(),
    date: z.string(),
    kind: z.enum(['EXPENSE', 'INCOME']),
    categoryId: z.string(),
    counterparty: z.string(),
    amount: moneySchema,
    paymentAccountCode: z.string().nullable(),
    receiptKey: z.string().nullable(),
    status: z.enum(['ACTIVE', 'VOIDED']),
    // La que hay que mandar al editar o anular: si no coincide con la de la base, 409.
    version: z.number().int(),
    posted: z.boolean(),
    journalEntryId: z.string().nullable(),
  })
  .meta({ id: 'Movement', title: 'Movement' })

// Lo que una categoría suma dentro de un filtro. Sin nombre ni color: el catálogo de
// categorías ya viaja a la pantalla, y repetirlo acá sería dos fuentes para el mismo dato.
export const categoryTotalResponseSchema = z
  .object({
    categoryId: z.string(),
    total: moneySchema,
  })
  .meta({ id: 'CategoryTotal', title: 'CategoryTotal' })

export const journalEntryResponseSchema = z
  .object({
    id: z.string(),
    date: z.string(),
    description: z.string(),
    reference: z.string().nullable(),
    sourceMovementId: z.string().nullable(),
    reversesEntryId: z.string().nullable(),
    lines: z.array(
      z.object({
        accountCode: z.string(),
        amount: moneySchema,
        side: z.enum(['DEBIT', 'CREDIT']),
      }),
    ),
  })
  .meta({ id: 'JournalEntry', title: 'JournalEntry' })

export const trialBalanceResponseSchema = z
  .object({
    rows: z.array(
      z.object({
        accountCode: z.string(),
        accountName: z.string(),
        debits: moneySchema,
        credits: moneySchema,
        balance: moneySchema,
      }),
    ),
    totalDebits: moneySchema,
    totalCredits: moneySchema,
    difference: moneySchema,
    balances: z.boolean(),
  })
  .meta({ id: 'TrialBalance', title: 'TrialBalance' })

export const ledgerResponseSchema = z
  .object({
    openingBalance: moneySchema,
    rows: z.array(
      z.object({
        date: z.string(),
        entryId: z.string(),
        description: z.string(),
        debit: moneySchema,
        credit: moneySchema,
        runningBalance: moneySchema,
      }),
    ),
    closingBalance: moneySchema,
  })
  .meta({ id: 'GeneralLedger', title: 'GeneralLedger' })

export const financialPositionResponseSchema = z
  .object({
    assets: moneySchema,
    liabilities: moneySchema,
    equity: moneySchema,
    periodResult: moneySchema,
    balances: z.boolean(),
    sections: z.object({
      assets: z.array(reportNodeSchema),
      liabilities: z.array(reportNodeSchema),
      equity: z.array(reportNodeSchema),
    }),
  })
  .meta({ id: 'FinancialPosition', title: 'FinancialPosition' })

export const netWorthResponseSchema = z
  .object({
    at: z.string(),
    currency: z.string(),
    assets: moneySchema,
    liabilities: moneySchema,
    equity: moneySchema,
    netWorth: moneySchema,
    // Lo que movió el tipo de cambio y ningún asiento reconoce: patrimonio = libros + esto.
    exchangeDifference: moneySchema,
    balances: z.boolean(),
    byCurrency: z.array(
      z.object({
        currency: z.string(),
        rate: z.string(),
        netWorthNative: moneySchema,
        netWorthTranslated: moneySchema,
      }),
    ),
  })
  .meta({ id: 'NetWorth', title: 'NetWorth' })

export const incomeStatementResponseSchema = z
  .object({
    income: moneySchema,
    costOfRevenue: moneySchema,
    operatingExpenses: moneySchema,
    result: moneySchema,
    sections: z.object({
      income: z.array(reportNodeSchema),
      costOfRevenue: z.array(reportNodeSchema),
      operatingExpenses: z.array(reportNodeSchema),
    }),
  })
  .meta({ id: 'IncomeStatement', title: 'IncomeStatement' })

export const periodResponseSchema = z
  .object({
    period: z.string(),
    status: z.enum(['OPEN', 'CLOSED']),
    closedAt: z.string().nullable(),
  })
  .meta({ id: 'AccountingPeriod', title: 'AccountingPeriod' })

export const periodSummaryResponseSchema = z
  .object({
    period: z.string(),
    status: z.enum(['OPEN', 'CLOSED']),
    entryCount: z.number(),
    unpostedMovementCount: z.number(),
    trialBalanceBalances: z.boolean(),
    blockers: z.array(z.object({ code: z.string(), reason: z.string() })),
  })
  .meta({ id: 'PeriodSummary', title: 'PeriodSummary' })

export const reopenedPeriodsResponseSchema = z
  .object({ reopened: z.array(periodResponseSchema) })
  .meta({ id: 'ReopenedPeriods', title: 'ReopenedPeriods' })
