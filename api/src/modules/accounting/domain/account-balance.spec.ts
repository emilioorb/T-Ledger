import { describe, expect, it } from 'vitest'
import { Money } from '../../../shared/kernel/money.js'
import { signedBalance } from './account-balance.js'

const crc = (minorUnits: bigint) => Money.fromMinorUnits(minorUnits, 'CRC')

describe('signedBalance', () => {
  it('una cuenta deudora con más débitos queda positiva', () => {
    expect(signedBalance(crc(1_000n), crc(400n), 'ASSET').minorUnits).toBe(600n)
  })

  it('una cuenta deudora con más créditos queda negativa', () => {
    expect(signedBalance(crc(0n), crc(219_698_00n), 'ASSET').minorUnits).toBe(-219_698_00n)
  })

  it('una cuenta acreedora con más créditos queda positiva', () => {
    expect(signedBalance(crc(0n), crc(500_000_00n), 'LIABILITY').minorUnits).toBe(500_000_00n)
  })

  it('una cuenta acreedora con más débitos queda negativa', () => {
    expect(signedBalance(crc(700n), crc(200n), 'INCOME').minorUnits).toBe(-500n)
  })

  it('aplica el signo correcto a las seis clases', () => {
    const debits = crc(1_000n)
    const credits = crc(300n)

    expect(signedBalance(debits, credits, 'ASSET').minorUnits).toBe(700n)
    expect(signedBalance(debits, credits, 'COST_OF_REVENUE').minorUnits).toBe(700n)
    expect(signedBalance(debits, credits, 'OPERATING_EXPENSE').minorUnits).toBe(700n)
    expect(signedBalance(debits, credits, 'LIABILITY').minorUnits).toBe(-700n)
    expect(signedBalance(debits, credits, 'EQUITY').minorUnits).toBe(-700n)
    expect(signedBalance(debits, credits, 'INCOME').minorUnits).toBe(-700n)
  })
})
