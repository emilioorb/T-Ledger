import { describe, expect, it } from 'vitest'
import { InterestRate } from './interest-rate.js'
import { isErr, unwrap } from './result.js'

describe('InterestRate', () => {
  it('deriva la tasa mensual de una tasa nominal con capitalización mensual', () => {
    const rate = unwrap(InterestRate.create(12, 'MONTHLY'))
    expect(rate.monthlyRate().toString()).toBe('0.01')
  })

  it('deriva la tasa mensual equivalente de una tasa efectiva anual', () => {
    const rate = unwrap(InterestRate.create(12, 'ANNUAL'))
    expect(rate.monthlyRate().toDecimalPlaces(8).toString()).toBe('0.00948879')
  })

  it('trata el 0 % como una tasa válida, no como ausencia de tasa', () => {
    const rate = unwrap(InterestRate.create(0, 'MONTHLY'))
    expect(rate.isZero()).toBe(true)
    expect(rate.monthlyRate().toNumber()).toBe(0)
    expect(InterestRate.zero().isZero()).toBe(true)
  })

  it('rechaza tasas negativas', () => {
    expect(isErr(InterestRate.create(-0.5, 'MONTHLY'))).toBe(true)
  })
})
