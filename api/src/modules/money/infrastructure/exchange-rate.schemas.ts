import { z } from 'zod'
import { isoDate } from '../../../shared/http/date.schema.js'

export const listRatesQuerySchema = z
  .object({ indicator: z.enum(['317', '318']).default('317'), from: isoDate, to: isoDate })
  .meta({ id: 'ListRatesQuery', title: 'ListRatesQuery' })

export const exchangeRateSchema = z
  .object({ indicator: z.enum(['317', '318']), value: z.string(), publishedAt: isoDate })
  .meta({ id: 'ExchangeRate', title: 'ExchangeRate' })

export const latestRatesSchema = z
  .object({
    buy: exchangeRateSchema.nullable(),
    sell: exchangeRateSchema.nullable(),
    stale: z.boolean(),
    checkedAt: z.string(),
  })
  .meta({ id: 'LatestExchangeRates', title: 'LatestExchangeRates' })

export type ListRatesQuery = z.infer<typeof listRatesQuerySchema>
export type ExchangeRateResponse = z.infer<typeof exchangeRateSchema>
export type LatestRates = z.infer<typeof latestRatesSchema>
