import type { DateRange } from '../../../shared/kernel/date-range.js'
import type { ExchangeRate, RateIndicator } from './exchange-rate.js'

export interface ExchangeRateRepository {
  // «Vigente en la fecha X» es la última publicación con fecha menor o igual a X:
  // el BCCR no publica fines de semana ni feriados.
  findEffectiveAt(indicator: RateIndicator, date: Date): Promise<ExchangeRate | null>
  findLatest(indicator: RateIndicator): Promise<ExchangeRate | null>
  findInRange(indicator: RateIndicator, range: DateRange): Promise<ExchangeRate[]>
  saveMany(rates: readonly ExchangeRate[]): Promise<number>
}

export const EXCHANGE_RATE_REPOSITORY = Symbol('EXCHANGE_RATE_REPOSITORY')
