import type { ZodOpenApiPathsObject } from 'zod-openapi'
import { libroPropioResponseSchema, vaciadoResponseSchema } from './libro.responses.js'
import { borrarLibroSchema, vaciarLibroSchema } from './libro.schemas.js'

const json = <T>(schema: T) => ({ content: { 'application/json': { schema } } })

export const libroOpenApiPaths: ZodOpenApiPathsObject = {
  '/book': {
    delete: {
      summary: 'Borra el libro activo entero, para todos sus miembros. No se puede con el último',
      requestBody: json(borrarLibroSchema),
      responses: {
        204: { description: 'Borrado' },
        401: { description: 'La contraseña no es la de quien pide' },
        409: { description: 'Es el único libro de la persona' },
      },
    },
  },
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
