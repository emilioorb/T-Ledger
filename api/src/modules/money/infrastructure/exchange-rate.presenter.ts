import type { ExchangeRate } from '../domain/exchange-rate.js'
import type { ExchangeRateResponse } from './exchange-rate.schemas.js'

const toIsoDate = (date: Date): string => date.toISOString().slice(0, 10)

// El valor viaja como string por la misma razón que los montos: un decimal que pasa por
// el doble de JavaScript deja de ser el que publicó el banco central.
export const toExchangeRateResponse = (rate: ExchangeRate): ExchangeRateResponse => ({
  indicator: rate.indicator,
  value: rate.value.toString(),
  publishedAt: toIsoDate(rate.publishedAt),
})
