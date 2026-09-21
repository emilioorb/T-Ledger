import { Inject, Injectable, Logger } from '@nestjs/common'
import { DateRange } from '../../../shared/kernel/date-range.js'
import { isErr } from '../../../shared/kernel/result.js'
import {
  EXCHANGE_RATE_PROVIDER,
  type ExchangeRateProviderPort,
} from '../domain/exchange-rate-provider.port.js'
import {
  EXCHANGE_RATE_REPOSITORY,
  type ExchangeRateRepository,
} from '../domain/exchange-rate-repository.port.js'
import { RATE_INDICATORS } from '../domain/exchange-rate.js'

export interface SyncReport {
  fetched: number
  saved: number
  from: Date
  to: Date
  failed: boolean
  reason?: string
}

const MS_PER_DAY = 86_400_000
const BACKFILL_DAYS = 365

const atUtcMidnight = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))

@Injectable()
export class SyncExchangeRatesUseCase {
  private readonly logger = new Logger(SyncExchangeRatesUseCase.name)

  constructor(
    @Inject(EXCHANGE_RATE_PROVIDER) private readonly provider: ExchangeRateProviderPort,
    @Inject(EXCHANGE_RATE_REPOSITORY) private readonly repository: ExchangeRateRepository,
  ) {}

  async execute(now = new Date()): Promise<SyncReport> {
    const today = atUtcMidnight(now)
    const latest = await this.repository.findLatest(RATE_INDICATORS.BUY)
    const from = latest
      ? new Date(latest.publishedAt.getTime() + MS_PER_DAY)
      : new Date(today.getTime() - BACKFILL_DAYS * MS_PER_DAY)

    if (from.getTime() > today.getTime()) {
      return { fetched: 0, saved: 0, from: today, to: today, failed: false }
    }

    const range = DateRange.create(from, today)
    if (isErr(range)) {
      return { fetched: 0, saved: 0, from, to: today, failed: true, reason: range.error.message }
    }

    try {
      // Un solo pedido cubre todo el hueco, sea de un día o de un año.
      const rates = await this.provider.fetchRates(range.value)
      const saved = await this.repository.saveMany(rates)
      return { fetched: rates.length, saved, from, to: today, failed: false }
    } catch (cause) {
      // La disponibilidad del banco central no puede tumbar la aplicación:
      // se registra, se reporta, y se sigue con la última tasa conocida.
      const reason = cause instanceof Error ? cause.message : String(cause)
      this.logger.error(`No se pudieron sincronizar los tipos de cambio: ${reason}`)
      return { fetched: 0, saved: 0, from, to: today, failed: true, reason }
    }
  }
}
