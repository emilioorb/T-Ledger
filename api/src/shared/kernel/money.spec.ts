import { Decimal } from 'decimal.js'
import { describe, expect, it } from 'vitest'
import { CurrencyMismatchError, Money } from './money.js'
import { isErr, unwrap } from './result.js'

const crc = (minorUnits: bigint) => Money.fromMinorUnits(minorUnits, 'CRC')

describe('Money', () => {
  it('construye desde decimal redondeando a la unidad mínima', () => {
    expect(Money.fromDecimal('1234.567', 'CRC').minorUnits).toBe(123457n)
    expect(Money.fromDecimal('1234.564', 'CRC').minorUnits).toBe(123456n)
  })

  it('suma y resta montos de la misma moneda', () => {
    expect(unwrap(crc(1000n).add(crc(250n))).minorUnits).toBe(1250n)
    expect(unwrap(crc(1000n).subtract(crc(250n))).minorUnits).toBe(750n)
  })

  it('falla explícitamente al operar monedas distintas', () => {
    const result = crc(1000n).add(Money.fromMinorUnits(1000n, 'USD'))
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(CurrencyMismatchError)
      expect(result.error.code).toBe('CURRENCY_MISMATCH')
    }
  })

  it('multiplica con redondeo a la unidad mínima', () => {
    expect(crc(10_000n).multiply('0.075').minorUnits).toBe(750n)
    expect(crc(333n).multiply(new Decimal(1).div(3)).minorUnits).toBe(111n)
  })

  it('compara montos de la misma moneda', () => {
    expect(unwrap(crc(1000n).compareTo(crc(500n)))).toBe(1)
    expect(unwrap(crc(500n).compareTo(crc(1000n)))).toBe(-1)
    expect(unwrap(crc(500n).compareTo(crc(500n)))).toBe(0)
  })

  it('allocate cuadra exactamente en un reparto no divisible', () => {
    const parts = crc(5n).allocate([1, 1, 1])
    expect(parts.map((p) => p.minorUnits)).toEqual([2n, 2n, 1n])
    const total = parts.reduce((acc, p) => acc + p.minorUnits, 0n)
    expect(total).toBe(5n)
  })

  it('allocate reparte por porcentajes sin perder unidades', () => {
    const parts = crc(100_000_1n).allocate([50, 30, 20])
    const total = parts.reduce((acc, p) => acc + p.minorUnits, 0n)
    expect(total).toBe(100_000_1n)
  })

  it('allocate respeta el orden de las razones', () => {
    const parts = crc(5n).allocate([3, 7])
    expect(parts.map((p) => p.minorUnits)).toEqual([2n, 3n])
  })

  it('allocate conserva el signo de un monto negativo', () => {
    const parts = crc(-5n).allocate([1, 1, 1])
    expect(parts.map((p) => p.minorUnits)).toEqual([-2n, -2n, -1n])
  })

  it('allocate rechaza una lista vacía o razones que suman cero', () => {
    expect(() => crc(100n).allocate([])).toThrow(RangeError)
    expect(() => crc(100n).allocate([0, 0])).toThrow(RangeError)
  })

  it('se serializa sin perder precisión', () => {
    expect(crc(56_349_293_00n).toJSON()).toEqual({
      minorUnits: '5634929300',
      currency: 'CRC',
    })
  })
})
