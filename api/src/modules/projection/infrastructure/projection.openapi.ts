import type { ZodOpenApiPathsObject } from 'zod-openapi'
import { projectionQuerySchema } from './projections.controller.js'

export const projectionOpenApiPaths: ZodOpenApiPathsObject = {
  '/projections': {
    get: {
      summary:
        'Proyecta el flujo mes a mes: ingreso, egreso comprometido, excedente y qué cuotas se liberan',
      requestParams: { query: projectionQuerySchema },
      responses: { 200: { description: 'Flujo proyectado por mes' } },
    },
  },
}
