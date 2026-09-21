import { Decimal } from 'decimal.js'
import { unwrap } from '../../../shared/kernel/result.js'
import { ExchangeRate, type RateIndicator } from '../domain/exchange-rate.js'

export interface ExchangeRateRow {
  indicator: string
  value: { toString(): string }
  publishedAt: Date
}

export const toDomain = (row: ExchangeRateRow): ExchangeRate =>
  unwrap(
    ExchangeRate.create({
      indicator: row.indicator as RateIndicator,
      value: new Decimal(row.value.toString()),
      publishedAt: row.publishedAt,
    }),
  )
