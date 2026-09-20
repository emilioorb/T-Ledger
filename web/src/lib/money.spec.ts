import { describe, expect, it } from 'vitest'
import { formatMoney, parseMoneyInput, toMoneyInput } from './money.js'

describe('formatMoney', () => {
  it('formatea colones con separadores de miles y sin decimales sobrantes', () => {
    expect(formatMoney({ minorUnits: '5634929300', currency: 'CRC' })).toBe('₡56 349 293,00')
  })

  it('formatea dólares', () => {
    expect(formatMoney({ minorUnits: '150000', currency: 'USD' })).toBe('$1 500,00')
  })

  it('formatea cero y negativos sin romper', () => {
    expect(formatMoney({ minorUnits: '0', currency: 'CRC' })).toContain('0')
    expect(formatMoney({ minorUnits: '-2500', currency: 'CRC' })).toContain('-')
  })

  it('no pierde precisión en montos que desbordan el entero seguro de JavaScript', () => {
    expect(formatMoney({ minorUnits: '900719925474099100', currency: 'CRC' })).toContain(
      '9 007 199 254 740 991',
    )
  })
})

describe('parseMoneyInput', () => {
  it('convierte lo que el usuario escribe a unidades mínimas', () => {
    expect(parseMoneyInput('56 349 293,00', 'CRC')).toEqual({
      minorUnits: '5634929300',
      currency: 'CRC',
    })
  })

  it('tolera la ausencia de decimales', () => {
    expect(parseMoneyInput('1000', 'CRC')).toEqual({ minorUnits: '100000', currency: 'CRC' })
  })

  it('rechaza texto que no es un monto', () => {
    expect(() => parseMoneyInput('mucha plata', 'CRC')).toThrow(RangeError)
  })
})

describe('toMoneyInput', () => {
  it('devuelve el monto listo para un campo de texto, sin símbolo ni separadores', () => {
    expect(toMoneyInput({ minorUnits: '5634929300', currency: 'CRC' })).toBe('56349293,00')
  })

  it('conserva el signo y no pierde precisión', () => {
    expect(toMoneyInput({ minorUnits: '-2500', currency: 'CRC' })).toBe('-25,00')
    expect(toMoneyInput({ minorUnits: '900719925474099100', currency: 'CRC' })).toBe(
      '9007199254740991,00',
    )
  })

  it('es la inversa de parseMoneyInput', () => {
    const money = { minorUnits: '5634929300', currency: 'CRC' } as const
    expect(parseMoneyInput(toMoneyInput(money), 'CRC')).toEqual(money)
  })
})
