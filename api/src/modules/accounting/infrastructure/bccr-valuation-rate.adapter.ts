import { Inject, Injectable } from '@nestjs/common'
import { Decimal } from 'decimal.js'
import type { CurrencyCode } from '../../../shared/kernel/currency.js'
import { RATE_INDICATORS } from '../../money/domain/exchange-rate.js'
import {
  EXCHANGE_RATE_REPOSITORY,
  type ExchangeRateRepository,
} from '../../money/domain/exchange-rate-repository.port.js'
import { rateKey, type ValuationRateSource } from '../domain/valuation-rate.port.js'

// La moneda en la que Emilio piensa su patrimonio. Una unidad suya vale una unidad suya.
export const FUNCTIONAL_CURRENCY: CurrencyCode = 'CRC'

const ONE = new Decimal(1)

@Injectable()
export class BccrValuationRateAdapter implements ValuationRateSource {
  constructor(
    @Inject(EXCHANGE_RATE_REPOSITORY) private readonly rates: ExchangeRateRepository,
  ) {}

  // La compra y no la venta: la pregunta que el patrimonio responde es cuántos colones
  // darían hoy por esos dólares, y por los dólares pagan la compra.
  async ratesFor(
    dates: readonly Date[],
    currency: CurrencyCode,
  ): Promise<Map<string, Decimal>> {
    const unique = [...new Map(dates.map((date) => [rateKey(date), date])).entries()]

    if (currency === FUNCTIONAL_CURRENCY) {
      return new Map(unique.map(([key]) => [key, ONE]))
    }

    const found = await Promise.all(
      unique.map(async ([key, date]) => {
        const rate = await this.rates.findEffectiveAt(RATE_INDICATORS.BUY, date)
        return [key, rate?.value ?? null] as const
      }),
    )

    return new Map(
      found.filter((entry): entry is readonly [string, Decimal] => entry[1] !== null),
    )
  }
}
