import { describe, expect, it } from 'vitest'
import { Percentage } from './percentage.js'
import { isErr, unwrap } from './result.js'

describe('Percentage', () => {
  it('acepta los extremos del rango', () => {
    expect(unwrap(Percentage.create(0)).value.toNumber()).toBe(0)
    expect(unwrap(Percentage.create(100)).value.toNumber()).toBe(100)
  })

  it('convierte a fracción', () => {
    expect(unwrap(Percentage.create('12.5')).toFraction().toString()).toBe('0.125')
  })

  it('rechaza valores fuera del rango 0–100', () => {
    expect(isErr(Percentage.create(-1))).toBe(true)
    expect(isErr(Percentage.create('100.01'))).toBe(true)
  })
})
