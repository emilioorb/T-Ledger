import type { ZodOpenApiPathsObject } from 'zod-openapi'
import {
  accountsTreeQuerySchema,
  createAccountSchema,
  createCategorySchema,
  createJournalEntrySchema,
  createMovementSchema,
  financialPositionQuerySchema,
  incomeStatementQuerySchema,
  ledgerQuerySchema,
  listAccountsQuerySchema,
  listJournalEntriesQuerySchema,
  listMovementsQuerySchema,
  trialBalanceQuerySchema,
  updateAccountSchema,
  updateCategorySchema,
  updateMovementSchema,
} from './accounting.schemas.js'

const json = <T>(schema: T) => ({ content: { 'application/json': { schema } } })

export const accountingOpenApiPaths: ZodOpenApiPathsObject = {
  '/accounts': {
    get: {
      summary: 'Lista el plan de cuentas',
      requestParams: { query: listAccountsQuerySchema },
      responses: { 200: { description: 'Cuentas del plan' } },
    },
    post: {
      summary: 'Agrega una cuenta al plan',
      requestBody: json(createAccountSchema),
      responses: { 201: { description: 'Cuenta creada' } },
    },
  },
  '/accounts/tree': {
    get: {
      summary: 'Devuelve el plan de cuentas como árbol, con el saldo acumulado a una fecha',
      requestParams: { query: accountsTreeQuerySchema },
      responses: { 200: { description: 'Árbol de cuentas con saldos' } },
    },
  },
  '/accounts/{code}': {
    get: { summary: 'Devuelve una cuenta', responses: { 200: { description: 'Cuenta' } } },
    patch: {
      summary: 'Modifica una cuenta',
      requestBody: json(updateAccountSchema),
      responses: { 200: { description: 'Cuenta modificada' } },
    },
  },
  '/categories': {
    get: { summary: 'Lista las categorías', responses: { 200: { description: 'Categorías' } } },
    post: {
      summary: 'Crea una categoría',
      requestBody: json(createCategorySchema),
      responses: { 201: { description: 'Categoría creada' } },
    },
  },
  '/categories/{id}': {
    get: { summary: 'Devuelve una categoría', responses: { 200: { description: 'Categoría' } } },
    patch: {
      summary: 'Modifica una categoría',
      requestBody: json(updateCategorySchema),
      responses: { 200: { description: 'Categoría modificada' } },
    },
    delete: { summary: 'Borra una categoría', responses: { 204: { description: 'Borrada' } } },
  },
  '/movements': {
    get: {
      summary: 'Lista movimientos',
      requestParams: { query: listMovementsQuerySchema },
      responses: { 200: { description: 'Movimientos' } },
    },
    post: {
      summary: 'Registra un gasto o un ingreso, y su asiento si la categoría tiene cuenta',
      requestBody: json(createMovementSchema),
      responses: { 201: { description: 'Movimiento registrado' } },
    },
  },
  '/movements/{id}': {
    get: { summary: 'Devuelve un movimiento', responses: { 200: { description: 'Movimiento' } } },
    patch: {
      summary: 'Corrige un movimiento: revierte su asiento vigente y emite uno nuevo',
      requestBody: json(updateMovementSchema),
      responses: { 200: { description: 'Movimiento corregido' } },
    },
  },
  '/movements/{id}/void': {
    post: {
      summary: 'Anula un movimiento y registra el asiento de reversión',
      responses: { 200: { description: 'Movimiento anulado' } },
    },
  },
  '/journal-entries': {
    get: {
      summary: 'Lista los asientos de un rango',
      requestParams: { query: listJournalEntriesQuerySchema },
      responses: { 200: { description: 'Asientos' } },
    },
    post: {
      summary: 'Registra un asiento manual, con invariante por moneda',
      requestBody: json(createJournalEntrySchema),
      responses: { 201: { description: 'Asiento registrado' } },
    },
  },
  '/journal-entries/{id}': {
    get: { summary: 'Devuelve un asiento', responses: { 200: { description: 'Asiento' } } },
  },
  '/reports/ledger': {
    get: {
      summary: 'Mayor de una cuenta en una moneda',
      requestParams: { query: ledgerQuerySchema },
      responses: { 200: { description: 'Mayor con saldo inicial, corrido y final' } },
    },
  },
  '/reports/trial-balance': {
    get: {
      summary: 'Balance de comprobación, en JSON o CSV',
      requestParams: { query: trialBalanceQuerySchema },
      responses: { 200: { description: 'Comprobación del período' } },
    },
  },
  '/reports/financial-position': {
    get: {
      summary: 'Estado de situación a una fecha, con el resultado del período en patrimonio',
      requestParams: { query: financialPositionQuerySchema },
      responses: { 200: { description: 'Estado de situación' } },
    },
  },
  '/reports/income-statement': {
    get: {
      summary: 'Estado de resultados de un rango',
      requestParams: { query: incomeStatementQuerySchema },
      responses: { 200: { description: 'Estado de resultados' } },
    },
  },
  '/periods': {
    get: {
      summary: 'Estado de cada mes con actividad y qué falta para poder cerrarlo',
      responses: { 200: { description: 'Períodos' } },
    },
  },
  '/periods/{period}/close': {
    post: {
      summary: 'Cierra un mes si no hay bloqueos',
      responses: {
        200: { description: 'Período cerrado' },
        422: { description: 'El período tiene bloqueos' },
      },
    },
  },
  '/periods/{period}/reopen': {
    post: {
      summary: 'Reabre un mes y todos los posteriores que estén cerrados',
      responses: { 200: { description: 'Períodos reabiertos' } },
    },
  },
}
