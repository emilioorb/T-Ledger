import type { ZodOpenApiPathsObject } from 'zod-openapi'
import { exchangeRateSchema, latestRatesSchema } from './exchange-rate.schemas.js'

const json = <T>(schema: T) => ({ content: { 'application/json': { schema } } })

export const exchangeRatesOpenApiPaths: ZodOpenApiPathsObject = {
  '/exchange-rates': {
    get: {
      summary: 'Lista las tasas publicadas en un rango',
      responses: { 200: { description: 'Tasas del rango', ...json(exchangeRateSchema.array()) } },
    },
  },
  '/exchange-rates/latest': {
    get: {
      summary: 'Devuelve la última tasa de compra y de venta, y si está desactualizada',
      responses: { 200: { description: 'Últimas tasas', ...json(latestRatesSchema) } },
    },
  },
}
