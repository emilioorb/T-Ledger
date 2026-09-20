import type { ZodOpenApiPathsObject } from 'zod-openapi'
import { createDebtSchema, debtResponseSchema, updateDebtSchema } from './debt.schemas.js'
import {
  payoffPlanResponseSchema,
  projectionResponseSchema,
  scheduleResponseSchema,
  simulateExtraPaymentSchema,
} from './schedule.schemas.js'

const json = <T>(schema: T) => ({ content: { 'application/json': { schema } } })

// Las rutas reutilizan los mismos esquemas Zod que valida el controlador: el contrato
// tiene una sola fuente y el `title` de cada meta es lo que nombra los tipos del frontend.
export const debtsOpenApiPaths: ZodOpenApiPathsObject = {
  '/debts': {
    get: {
      summary: 'Lista las deudas con paginación',
      responses: { 200: { description: 'Página de deudas', ...json(debtResponseSchema.array()) } },
    },
    post: {
      summary: 'Crea una deuda o un préstamo otorgado',
      requestBody: json(createDebtSchema),
      responses: { 201: { description: 'Deuda creada', ...json(debtResponseSchema) } },
    },
  },
  '/debts/payoff-plan': {
    get: {
      summary: 'Ordena las deudas según la estrategia de pago elegida',
      responses: { 200: { description: 'Plan de pago', ...json(payoffPlanResponseSchema) } },
    },
  },
  '/debts/{id}': {
    get: {
      summary: 'Devuelve una deuda',
      responses: { 200: { description: 'Deuda', ...json(debtResponseSchema) } },
    },
    patch: {
      summary: 'Actualiza parcialmente una deuda',
      requestBody: json(updateDebtSchema),
      responses: { 200: { description: 'Deuda actualizada', ...json(debtResponseSchema) } },
    },
    delete: {
      summary: 'Borra una deuda',
      responses: { 204: { description: 'Deuda borrada' } },
    },
  },
  '/debts/{id}/schedule': {
    get: {
      summary: 'Devuelve la tabla de amortización completa',
      responses: { 200: { description: 'Tabla de amortización', ...json(scheduleResponseSchema) } },
    },
  },
  '/debts/{id}/simulate': {
    post: {
      summary: 'Simula un abono extraordinario y reporta el ahorro',
      requestBody: json(simulateExtraPaymentSchema),
      responses: { 200: { description: 'Proyección del abono', ...json(projectionResponseSchema) } },
    },
  },
}
