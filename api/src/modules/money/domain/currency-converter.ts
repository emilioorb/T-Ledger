import type { CurrencyCode } from '../../../shared/kernel/currency.js'
import { Money } from '../../../shared/kernel/money.js'
import { err, ok, type Result } from '../../../shared/kernel/result.js'
import type { ExchangeRate } from './exchange-rate.js'

// La tasa del BCCR expresa colones por dólar. Convertir a colones multiplica; a dólares divide.
export const convert = (
  amount: Money,
  to: CurrencyCode,
  rate: ExchangeRate,
): Result<Money, RangeError> => {
  if (amount.currency === to) return ok(amount)

  if (amount.currency === 'USD' && to === 'CRC') {
    return ok(Money.fromDecimal(amount.toDecimal().mul(rate.value), 'CRC'))
  }
  if (amount.currency === 'CRC' && to === 'USD') {
    return ok(Money.fromDecimal(amount.toDecimal().div(rate.value), 'USD'))
  }
  return err(new RangeError(`No hay conversión definida de ${amount.currency} a ${to}`))
}
