import type { ZodOpenApiPathsObject } from 'zod-openapi'
import {
  budgetEvaluationResponseSchema,
  budgetModelResponseSchema,
  budgetModelSchema,
  updateBudgetModelSchema,
  evaluationQuerySchema,
  monthlyIncomeResponseSchema,
  monthlyIncomeSchema,
} from './budget.schemas.js'

const json = <T>(schema: T) => ({ content: { 'application/json': { schema } } })

export const budgetOpenApiPaths: ZodOpenApiPathsObject = {
  '/budget/evaluation': {
    get: {
      summary: 'Evalúa un mes: cuánto se asignó por cubeta y cuánto se consumió de verdad',
      requestParams: { query: evaluationQuerySchema },
      responses: {
        200: { description: 'Evaluación del mes', ...json(budgetEvaluationResponseSchema) },
        422: { description: 'No hay modelo de presupuesto activo' },
      },
    },
  },
  '/budget/income/{period}': {
    get: {
      summary: 'Devuelve el ingreso declarado del mes',
      responses: { 200: { description: 'Ingreso del mes', ...json(monthlyIncomeResponseSchema) } },
    },
    put: {
      summary: 'Declara el ingreso estimado del mes',
      requestBody: json(monthlyIncomeSchema),
      responses: {
        200: { description: 'Ingreso declarado', ...json(monthlyIncomeResponseSchema) },
      },
    },
  },
  '/budget-models': {
    get: {
      summary: 'Lista los modelos de presupuesto',
      responses: { 200: { description: 'Modelos', ...json(budgetModelResponseSchema.array()) } },
    },
    post: {
      summary: 'Crea un modelo de presupuesto; activarlo desactiva el resto',
      requestBody: json(budgetModelSchema),
      responses: {
        201: { description: 'Modelo creado', ...json(budgetModelResponseSchema) },
        422: { description: 'Los porcentajes no suman 100 o falta la cubeta de ahorro' },
      },
    },
  },
  '/budget-models/{id}': {
    get: {
      summary: 'Devuelve un modelo de presupuesto',
      responses: { 200: { description: 'Modelo', ...json(budgetModelResponseSchema) } },
    },
    patch: {
      summary: 'Modifica un modelo de presupuesto',
      requestBody: json(updateBudgetModelSchema),
      responses: { 200: { description: 'Modelo modificado', ...json(budgetModelResponseSchema) } },
    },
  },
}
