import type { Decimal } from 'decimal.js'
import { err, ok, type Result } from '../../../shared/kernel/result.js'

export const RATE_INDICATORS = { BUY: '317', SELL: '318' } as const

export type RateIndicator = (typeof RATE_INDICATORS)[keyof typeof RATE_INDICATORS]

export interface ExchangeRateProps {
  readonly indicator: RateIndicator
  readonly value: Decimal
  readonly publishedAt: Date
}

const MS_PER_DAY = 86_400_000

const atUtcMidnight = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))

export class ExchangeRate {
  private constructor(
    readonly indicator: RateIndicator,
    readonly value: Decimal,
    readonly publishedAt: Date,
  ) {}

  static create(props: ExchangeRateProps): Result<ExchangeRate, RangeError> {
    if (!props.value.isFinite() || props.value.lessThanOrEqualTo(0)) {
      return err(new RangeError(`Una tasa debe ser mayor que cero, se recibió ${props.value.toString()}`))
    }
    if (Number.isNaN(props.publishedAt.getTime())) {
      return err(new RangeError('La tasa recibió una fecha de publicación inválida'))
    }
    // Una publicación del BCCR es un día, no un instante.
    return ok(new ExchangeRate(props.indicator, props.value, atUtcMidnight(props.publishedAt)))
  }

  isStalerThan(days: number, now: Date): boolean {
    return (atUtcMidnight(now).getTime() - this.publishedAt.getTime()) / MS_PER_DAY > days
  }
}
