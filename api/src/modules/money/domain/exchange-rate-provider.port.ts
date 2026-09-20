import type { DateRange } from '../../../shared/kernel/date-range.js'
import type { ExchangeRate } from './exchange-rate.js'

export interface ExchangeRateProviderPort {
  fetchRates(range: DateRange): Promise<ExchangeRate[]>
}

export const EXCHANGE_RATE_PROVIDER = Symbol('EXCHANGE_RATE_PROVIDER')
