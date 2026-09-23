import type { ZodOpenApiPathsObject } from 'zod-openapi'
import { createDebtSchema, debtResponseSchema, updateDebtSchema } from './debt.schemas.js'
import {
  debtScheduleResponseSchema,
  marcarCuotaPagadaSchema,
  pagarCuotaSchema,
  payoffPlanResponseSchema,
  projectionResponseSchema,
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
      summary: 'Devuelve la tabla de amortización, con el estado de cada cuota',
      responses: { 200: { description: 'Tabla de amortización', ...json(debtScheduleResponseSchema) } },
    },
  },
  '/debts/{id}/payments': {
    post: {
      summary: 'Paga la siguiente cuota y registra su gasto en la contabilidad',
      requestBody: json(pagarCuotaSchema),
      responses: {
        201: { description: 'Deuda con la cuota pagada', ...json(debtResponseSchema) },
        409: { description: 'El mes del pago está cerrado' },
        422: { description: 'No quedan cuotas o la fecha es anterior al último pago' },
      },
    },
  },
  '/debts/{id}/payments/settled': {
    post: {
      summary: 'Salda la siguiente cuota sin movimiento, para lo pagado antes de llevar el libro',
      requestBody: json(marcarCuotaPagadaSchema),
      responses: { 201: { description: 'Deuda con la cuota saldada', ...json(debtResponseSchema) } },
    },
  },
  '/debts/{id}/document': {
    post: {
      summary: 'Adjunta el contrato de la deuda (PDF o foto, hasta 20 MB) en multipart/form-data, campo `archivo`',
      responses: {
        200: { description: 'Deuda con documento', ...json(debtResponseSchema) },
        400: { description: 'El archivo no es un PDF o una foto, está vacío o pesa de más' },
      },
    },
    get: {
      summary: 'Redirige al enlace firmado del documento',
      responses: { 302: { description: 'Enlace de lectura' }, 404: { description: 'Sin documento' } },
    },
    delete: {
      summary: 'Quita el documento de la deuda',
      responses: { 200: { description: 'Deuda sin documento', ...json(debtResponseSchema) } },
    },
  },
  '/debts/{id}/payments/last': {
    delete: {
      summary: 'Deshace el último pago y anula su movimiento, si tiene',
      responses: { 200: { description: 'Deuda sin ese pago', ...json(debtResponseSchema) } },
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
