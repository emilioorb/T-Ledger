import type { ZodOpenApiPathsObject } from 'zod-openapi'
import {
  bankAccountResponseSchema,
  bankAccountSchema,
  updateBankAccountSchema,
  updateImportProfileSchema,
  importProfileResponseSchema,
  importProfileSchema,
  importResultResponseSchema,
  lineToMovementSchema,
  matchLineSchema,
  parsedLineResponseSchema,
  reconciliationQuerySchema,
  reconciliationResponseSchema,
} from './banking.schemas.js'

const json = <T>(schema: T) => ({ content: { 'application/json': { schema } } })

export const bankingOpenApiPaths: ZodOpenApiPathsObject = {
  '/bank-accounts': {
    get: {
      summary: 'Lista las cuentas bancarias',
      responses: { 200: { description: 'Cuentas', ...json(bankAccountResponseSchema.array()) } },
    },
    post: {
      summary: 'Registra una cuenta bancaria contra una cuenta del plan',
      requestBody: json(bankAccountSchema),
      responses: {
        201: { description: 'Cuenta creada', ...json(bankAccountResponseSchema) },
        422: { description: 'La cuenta contable no acepta asientos' },
      },
    },
  },
  '/bank-accounts/{id}': {
    get: {
      summary: 'Devuelve una cuenta bancaria',
      responses: { 200: { description: 'Cuenta', ...json(bankAccountResponseSchema) } },
    },
    patch: {
      summary: 'Modifica una cuenta bancaria',
      requestBody: json(updateBankAccountSchema),
      responses: { 200: { description: 'Cuenta modificada', ...json(bankAccountResponseSchema) } },
    },
  },
  '/import-profiles': {
    get: {
      summary: 'Lista los perfiles de importación',
      responses: { 200: { description: 'Perfiles', ...json(importProfileResponseSchema.array()) } },
    },
    post: {
      summary: 'Crea un perfil: cómo leer el CSV de un banco',
      requestBody: json(importProfileSchema),
      responses: {
        201: { description: 'Perfil creado', ...json(importProfileResponseSchema) },
        422: { description: 'El perfil necesita monto con signo o el par débito y crédito' },
      },
    },
  },
  '/import-profiles/{id}': {
    get: {
      summary: 'Devuelve un perfil',
      responses: { 200: { description: 'Perfil', ...json(importProfileResponseSchema) } },
    },
    patch: {
      summary: 'Modifica un perfil',
      requestBody: json(updateImportProfileSchema),
      responses: { 200: { description: 'Perfil modificado', ...json(importProfileResponseSchema) } },
    },
  },
  '/bank-statements': {
    get: {
      summary: 'Lista los extractos importados',
      responses: { 200: { description: 'Extractos' } },
    },
    post: {
      summary: 'Importa un extracto en CSV, saltando las líneas que ya estaban',
      responses: {
        201: { description: 'Extracto importado', ...json(importResultResponseSchema) },
        422: { description: 'El archivo no coincide con el perfil' },
      },
    },
  },
  '/bank-statements/preview': {
    post: {
      summary: 'Lee el archivo con el perfil y devuelve las líneas sin guardar nada',
      responses: { 200: { description: 'Líneas leídas', ...json(parsedLineResponseSchema.array()) } },
    },
  },
  '/bank-accounts/{id}/reconciliation': {
    get: {
      summary: 'Líneas pendientes, sugerencias y los tres saldos',
      requestParams: { query: reconciliationQuerySchema },
      responses: { 200: { description: 'Conciliación', ...json(reconciliationResponseSchema) } },
    },
  },
  '/bank-lines/{id}/match': {
    post: {
      summary: 'Concilia la línea con un movimiento',
      requestBody: json(matchLineSchema),
      responses: {
        200: { description: 'Línea conciliada' },
        409: { description: 'El movimiento ya está conciliado con otra línea' },
      },
    },
  },
  '/bank-lines/{id}/unmatch': {
    post: { summary: 'Deshace la conciliación', responses: { 200: { description: 'Pendiente otra vez' } } },
  },
  '/bank-lines/{id}/ignore': {
    post: {
      summary: 'Saca la línea de pendientes sin crear nada',
      responses: { 200: { description: 'Línea ignorada' } },
    },
  },
  '/bank-lines/{id}/to-movement': {
    post: {
      summary: 'Crea el movimiento desde la línea y la concilia con él',
      requestBody: json(lineToMovementSchema),
      responses: {
        201: { description: 'Movimiento creado' },
        409: { description: 'El período está cerrado o la línea ya está conciliada' },
      },
    },
  },
}
