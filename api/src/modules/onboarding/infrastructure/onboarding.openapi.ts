import type { ZodOpenApiPathsObject } from 'zod-openapi'
import { z } from 'zod'
import {
  bancoCreadoSchema,
  banksSchema,
  categoriaCreadaSchema,
  categoriesSchema,
  incomeResponseSchema,
  incomeSchema,
  onboardingStatusResponseSchema,
  openingBalancesResponseSchema,
  openingBalancesSchema,
} from './onboarding.schemas.js'

const json = <T>(schema: T) => ({ content: { 'application/json': { schema } } })

export const onboardingOpenApiPaths: ZodOpenApiPathsObject = {
  '/onboarding': {
    get: {
      summary: 'Si la bienvenida está pendiente, en qué libro y qué pasos ya se hicieron',
      responses: { 200: { description: 'Estado de la bienvenida', ...json(onboardingStatusResponseSchema) } },
    },
  },
  '/onboarding/start': {
    post: { summary: 'Marca la bienvenida como vista: se muestra una sola vez', responses: { 204: { description: 'Marcada' } } },
  },
  '/onboarding/banks': {
    post: {
      summary: 'Crea la cuenta contable y la cuenta bancaria de cada banco',
      requestBody: json(banksSchema),
      responses: { 201: { description: 'Bancos creados', ...json(z.array(bancoCreadoSchema)) }, 422: { description: 'Regla del plan de cuentas' } },
    },
  },
  '/onboarding/opening-balances': {
    post: {
      summary: 'Asienta los saldos de hoy contra Aportes, un asiento por moneda',
      requestBody: json(openingBalancesSchema),
      responses: { 201: { description: 'Asientos de apertura', ...json(openingBalancesResponseSchema) }, 422: { description: 'Cuenta o monto no válidos' } },
    },
  },
  '/onboarding/categories': {
    post: {
      summary: 'Crea cada categoría con su propia cuenta',
      requestBody: json(categoriesSchema),
      responses: { 201: { description: 'Categorías creadas', ...json(z.array(categoriaCreadaSchema)) }, 409: { description: 'Nombre repetido' } },
    },
  },
  '/onboarding/income': {
    post: {
      summary: 'Declara el ingreso del mes',
      requestBody: json(incomeSchema),
      responses: { 201: { description: 'Ingreso declarado', ...json(incomeResponseSchema) } },
    },
  },
}
