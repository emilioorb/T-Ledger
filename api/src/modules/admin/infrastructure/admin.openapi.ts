import type { ZodOpenApiPathsObject } from 'zod-openapi'
import {
  invitacionALaAppResponseSchema,
  invitarALaAppSchema,
  resumenDeInstanciaResponseSchema,
  soyAdminResponseSchema,
} from './admin.responses.js'

const json = <T>(schema: T) => ({ content: { 'application/json': { schema } } })

export const adminOpenApiPaths: ZodOpenApiPathsObject = {
  '/admin/me': {
    get: {
      summary: 'Dice si quien pregunta administra la instancia',
      responses: { 200: { description: 'Sí o no', ...json(soyAdminResponseSchema) } },
    },
  },
  '/admin/invitations': {
    post: {
      summary: 'Invita a un correo a registrarse en la app, sin meterlo en ningún libro',
      requestBody: json(invitarALaAppSchema),
      responses: {
        201: { description: 'Invitación vigente por una semana', ...json(invitacionALaAppResponseSchema) },
        403: { description: 'No administrás esta instancia' },
        409: { description: 'Ese correo ya tiene cuenta' },
      },
    },
    get: {
      summary: 'Las invitaciones a la app que siguen esperando',
      responses: { 200: { description: 'Pendientes', ...json(invitacionALaAppResponseSchema.array()) } },
    },
  },
  '/admin/invitations/{id}': {
    delete: {
      summary: 'Cancela una invitación a la app sin usar',
      responses: { 204: { description: 'Cancelada' }, 404: { description: 'No existe o ya se usó' } },
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
