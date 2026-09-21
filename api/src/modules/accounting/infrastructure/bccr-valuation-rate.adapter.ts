import { Inject, Injectable } from '@nestjs/common'
import { Decimal } from 'decimal.js'
import type { CurrencyCode } from '../../../shared/kernel/currency.js'
import { RATE_INDICATORS, type ExchangeRate } from '../../money/domain/exchange-rate.js'
import {
  EXCHANGE_RATE_REPOSITORY,
  type ExchangeRateRepository,
} from '../../money/domain/exchange-rate-repository.port.js'
import { rateKey, type ValuationRateSource } from '../domain/valuation-rate.port.js'

// La moneda en la que Emilio piensa su patrimonio. Una unidad suya vale una unidad suya.
export const FUNCTIONAL_CURRENCY: CurrencyCode = 'CRC'

const ONE = new Decimal(1)

// «Vigente en X» es la última publicación con fecha menor o igual a X: el BCCR no publica
// fines de semana ni feriados. La lista viene ordenada de vieja a nueva, así que la última
// que no se pasa es la que vale.
const effectiveAt = (published: readonly ExchangeRate[], date: Date): Decimal | null => {
  let effective: ExchangeRate | null = null
  for (const rate of published) {
    if (rate.publishedAt.getTime() > date.getTime()) break
    effective = rate
  }
  return effective?.value ?? null
}

@Injectable()
export class BccrValuationRateAdapter implements ValuationRateSource {
  constructor(@Inject(EXCHANGE_RATE_REPOSITORY) private readonly rates: ExchangeRateRepository) {}

  // La compra y no la venta: la pregunta que el patrimonio responde es cuántos colones
  // darían hoy por esos dólares, y por los dólares pagan la compra.
  async ratesFor(dates: readonly Date[], currency: CurrencyCode): Promise<Map<string, Decimal>> {
    const unique = [...new Map(dates.map((date) => [rateKey(date), date])).entries()]

    if (currency === FUNCTIONAL_CURRENCY) {
      return new Map(unique.map(([key]) => [key, ONE]))
    }

    // Una sola consulta y después un recorrido: pedir la tasa vigente de cada fecha por
    // separado significaba una consulta por día con asientos de toda la historia, en el
    // endpoint del tablero.
    const latest = unique.reduce(
      (acc, [, date]) => (date.getTime() > acc.getTime() ? date : acc),
      unique[0]?.[1] ?? new Date(0),
    )
    const published = await this.rates.findPublishedUpTo(RATE_INDICATORS.BUY, latest)

    return new Map(
      unique
        .map(([key, date]) => [key, effectiveAt(published, date)] as const)
        .filter((entry): entry is readonly [string, Decimal] => entry[1] !== null),
    )
  }
}
