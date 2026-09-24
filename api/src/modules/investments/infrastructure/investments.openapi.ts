import type { ZodOpenApiPathsObject } from 'zod-openapi'
import { versionEnTextoSchema } from '../../../shared/http/version.schema.js'
import {
  createInvestmentSchema,
  investmentContributionSchema,
  investmentResponseSchema,
  projectionQuerySchema,
  updateInvestmentSchema,
} from './investments.schemas.js'

const json = <T>(schema: T) => ({ content: { 'application/json': { schema } } })

export const investmentsOpenApiPaths: ZodOpenApiPathsObject = {
  '/investments': {
    get: {
      summary: 'Lista las inversiones con su valor de hoy',
      responses: { 200: { description: 'Inversiones', ...json(investmentResponseSchema.array()) } },
    },
    post: {
      summary: 'Registra una inversión, a plazo o abierta',
      requestBody: json(createInvestmentSchema),
      responses: {
        201: { description: 'Inversión registrada', ...json(investmentResponseSchema) },
        422: { description: 'Un plazo fijo necesita vencimiento' },
      },
    },
  },
  '/investments/{id}': {
    get: {
      summary: 'Devuelve una inversión',
      responses: { 200: { description: 'Inversión', ...json(investmentResponseSchema) } },
    },
    patch: {
      summary: 'Modifica una inversión',
      requestBody: json(updateInvestmentSchema),
      responses: {
        200: { description: 'Inversión modificada', ...json(investmentResponseSchema) },
      },
    },
    delete: {
      summary: 'Borra una inversión y sus aportes',
      requestParams: { query: versionEnTextoSchema },
      responses: { 204: { description: 'Borrada' } },
    },
  },
  '/investments/{id}/projection': {
    get: {
      summary: 'Valor capitalizado a una fecha; una inversión a plazo no pasa de su vencimiento',
      requestParams: { query: projectionQuerySchema },
      responses: { 200: { description: 'Valor proyectado', ...json(investmentResponseSchema) } },
    },
  },
  '/investments/{id}/contributions': {
    post: {
      summary: 'Agrega capital, que capitaliza desde su propia fecha',
      requestBody: json(investmentContributionSchema),
      responses: {
        201: { description: 'Aporte registrado', ...json(investmentResponseSchema) },
        422: { description: 'El aporte es de otra moneda' },
      },
    },
  },
}
