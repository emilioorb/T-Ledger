import { Decimal } from 'decimal.js'
import { describe, expect, it } from 'vitest'
import type { CurrencyCode } from '../../../shared/kernel/currency.js'
import { Money } from '../../../shared/kernel/money.js'
import { isErr, unwrap } from '../../../shared/kernel/result.js'
import { convert } from './currency-converter.js'
import { ExchangeRate } from './exchange-rate.js'

const utc = (iso: string) => new Date(`${iso}T00:00:00.000Z`)
const venta = unwrap(
  ExchangeRate.create({ indicator: '318', value: new Decimal('520.50'), publishedAt: utc('2026-09-18') }),
)

describe('convert', () => {
  it('convierte dólares a colones con la tasa de venta', () => {
    const result = unwrap(convert(Money.fromMinorUnits(10_000n, 'USD'), 'CRC', venta))
    expect(result.currency).toBe('CRC')
    expect(result.minorUnits).toBe(5_205_000n)
  })

  it('convierte colones a dólares dividiendo por la tasa', () => {
    const result = unwrap(convert(Money.fromMinorUnits(5_205_000n, 'CRC'), 'USD', venta))
    expect(result.minorUnits).toBe(10_000n)
  })

  it('devuelve el mismo monto si la moneda destino es la de origen', () => {
    const original = Money.fromMinorUnits(12_345n, 'CRC')
    expect(unwrap(convert(original, 'CRC', venta)).minorUnits).toBe(12_345n)
  })

  // Hoy la rama es inalcanzable: con CRC y USD todo par es identidad o está definido. El
  // test existe para el día que aparezca una tercera moneda y nadie defina su conversión.
  it('falla ante un par sin conversión definida', () => {
    const euro = Money.fromMinorUnits(100n, 'EUR' as CurrencyCode)
    expect(isErr(convert(euro, 'CRC', venta))).toBe(true)
  })

  it('redondea a la unidad mínima sin perder el resto en el aire', () => {
    const result = unwrap(convert(Money.fromMinorUnits(1n, 'USD'), 'CRC', venta))
    expect(result.minorUnits).toBe(521n)
  })
})
