import { describe, expect, it } from 'vitest'
import { hayOtraMoneda } from './otra-moneda'

describe('hayOtraMoneda', () => {
  it('avisa cuando algo está en otra moneda que la que se mira', () => {
    expect(hayOtraMoneda([{ currency: 'CRC' }, { currency: 'USD' }], 'CRC')).toBe(true)
  })

  it('no avisa si todo está en la misma, ni sin nada', () => {
    expect(hayOtraMoneda([{ currency: 'CRC' }], 'CRC')).toBe(false)
    expect(hayOtraMoneda([], 'CRC')).toBe(false)
  })
})
