import type { ZodOpenApiPathsObject } from 'zod-openapi'
import { resumenDeInstanciaResponseSchema, soyAdminResponseSchema } from './admin.responses.js'

const json = <T>(schema: T) => ({ content: { 'application/json': { schema } } })

export const adminOpenApiPaths: ZodOpenApiPathsObject = {
  '/admin/me': {
    get: {
      summary: 'Dice si quien pregunta administra la instancia',
      responses: { 200: { description: 'Sí o no', ...json(soyAdminResponseSchema) } },
    },
  },
  '/admin/summary': {
    get: {
      summary: 'Los números del servidor entero, solo para la administración',
      responses: {
        200: { description: 'Resumen', ...json(resumenDeInstanciaResponseSchema) },
        403: { description: 'No administrás esta instancia' },
      },
    },
  },
}
