import type { ZodOpenApiPathsObject } from 'zod-openapi'
import {
  createContributionSchema,
  createGoalSchema,
  goalResponseSchema,
  updateGoalSchema,
} from './goals.schemas.js'

const json = <T>(schema: T) => ({ content: { 'application/json': { schema } } })

export const goalsOpenApiPaths: ZodOpenApiPathsObject = {
  '/goals': {
    get: {
      summary: 'Lista las metas por prioridad, con su avance y su fecha proyectada',
      responses: { 200: { description: 'Metas', ...json(goalResponseSchema.array()) } },
    },
    post: {
      summary: 'Crea una meta',
      requestBody: json(createGoalSchema),
      responses: { 201: { description: 'Meta creada', ...json(goalResponseSchema) } },
    },
  },
  '/goals/{id}': {
    get: { summary: 'Devuelve una meta', responses: { 200: { description: 'Meta', ...json(goalResponseSchema) } } },
    patch: {
      summary: 'Modifica una meta',
      requestBody: json(updateGoalSchema),
      responses: { 200: { description: 'Meta modificada', ...json(goalResponseSchema) } },
    },
    delete: { summary: 'Borra una meta y sus aportes', responses: { 204: { description: 'Borrada' } } },
  },
  '/goals/{id}/contributions': {
    post: {
      summary: 'Registra un aporte a la meta',
      requestBody: json(createContributionSchema),
      responses: {
        201: { description: 'Aporte registrado', ...json(goalResponseSchema) },
        422: { description: 'El aporte es de otra moneda' },
      },
    },
  },
}
