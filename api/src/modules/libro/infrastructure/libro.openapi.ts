import type { ZodOpenApiPathsObject } from 'zod-openapi'
import { libroPropioResponseSchema, vaciadoResponseSchema } from './libro.responses.js'
import { vaciarLibroSchema } from './libro.schemas.js'

const json = <T>(schema: T) => ({ content: { 'application/json': { schema } } })

export const libroOpenApiPaths: ZodOpenApiPathsObject = {
  '/book/mine': {
    get: {
      summary: 'Los libros a los que pertenece quien pregunta, con su rol en cada uno',
      responses: { 200: { description: 'Tus libros', ...json(libroPropioResponseSchema.array()) } },
    },
  },
  '/book/empty': {
    post: {
      summary: 'Borra lo anotado en el libro y conserva los catálogos y el registro',
      requestBody: json(vaciarLibroSchema),
      responses: { 200: { description: 'Lo que se borró', ...json(vaciadoResponseSchema) } },
    },
  },
}
