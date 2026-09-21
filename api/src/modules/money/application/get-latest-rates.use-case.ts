import { Inject, Injectable } from '@nestjs/common'
import {
  EXCHANGE_RATE_REPOSITORY,
  type ExchangeRateRepository,
} from '../domain/exchange-rate-repository.port.js'
import { RATE_INDICATORS, type ExchangeRate } from '../domain/exchange-rate.js'

export interface LatestRatesResult {
  buy: ExchangeRate | null
  sell: ExchangeRate | null
  stale: boolean
  checkedAt: Date
}

// Tres días, no uno: el BCCR publica a diario pero el job corre una vez y puede fallar una
// vez sin que eso sea un problema. A los tres días sí lo es.
const STALE_AFTER_DAYS = 3

@Injectable()
export class GetLatestRatesUseCase {
  constructor(
    @Inject(EXCHANGE_RATE_REPOSITORY) private readonly repository: ExchangeRateRepository,
  ) {}

  async execute(now = new Date()): Promise<LatestRatesResult> {
    const [buy, sell] = await Promise.all([
      this.repository.findLatest(RATE_INDICATORS.BUY),
      this.repository.findLatest(RATE_INDICATORS.SELL),
    ])

    // Sin datos es un estado, no una falla: se reporta como desactualizado.
    const stale = !buy || !sell || buy.isStalerThan(STALE_AFTER_DAYS, now)

    return { buy, sell, stale, checkedAt: now }
  }
}
