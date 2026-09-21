import { describe, expect, it } from 'vitest'
import { ACCOUNT_CLASSES, isResultClass, normalBalanceOf, rootCodeOf } from './account-class.js'

describe('AccountClass', () => {
  it('cubre las seis clases del plan', () => {
    expect(ACCOUNT_CLASSES).toEqual([
      'ASSET',
      'LIABILITY',
      'EQUITY',
      'INCOME',
      'COST_OF_REVENUE',
      'OPERATING_EXPENSE',
    ])
  })

  it('asigna saldo deudor a activo, costo y gasto', () => {
    expect(normalBalanceOf('ASSET')).toBe('DEBIT')
    expect(normalBalanceOf('COST_OF_REVENUE')).toBe('DEBIT')
    expect(normalBalanceOf('OPERATING_EXPENSE')).toBe('DEBIT')
  })

  it('asigna saldo acreedor a pasivo, patrimonio e ingreso', () => {
    expect(normalBalanceOf('LIABILITY')).toBe('CREDIT')
    expect(normalBalanceOf('EQUITY')).toBe('CREDIT')
    expect(normalBalanceOf('INCOME')).toBe('CREDIT')
  })

  it('reconoce las clases que forman el resultado del período', () => {
    expect(isResultClass('INCOME')).toBe(true)
    expect(isResultClass('COST_OF_REVENUE')).toBe(true)
    expect(isResultClass('OPERATING_EXPENSE')).toBe(true)
    expect(isResultClass('ASSET')).toBe(false)
    expect(isResultClass('LIABILITY')).toBe(false)
    expect(isResultClass('EQUITY')).toBe(false)
  })

  it('ancla cada clase a su código raíz', () => {
    expect(rootCodeOf('ASSET')).toBe('1000')
    expect(rootCodeOf('OPERATING_EXPENSE')).toBe('6000')
  })
})
