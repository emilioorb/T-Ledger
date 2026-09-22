import type { ZodOpenApiPathsObject } from 'zod-openapi'
import { entradaDeRastroSchema, listarRastroQuerySchema } from './auditoria.schemas.js'

const json = <T>(schema: T) => ({ content: { 'application/json': { schema } } })

export const auditoriaOpenApiPaths: ZodOpenApiPathsObject = {
  '/audit-log': {
    get: {
      summary: 'Lista quién cambió qué en el libro, del más reciente al más viejo',
      requestParams: { query: listarRastroQuerySchema },
      responses: {
        200: { description: 'Entradas del registro', ...json(entradaDeRastroSchema.array()) },
        403: { description: 'Solo el dueño del libro ve el registro' },
      },
    },
  },
}
