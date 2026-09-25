import { describe, expect, it } from 'vitest'
import { alternar } from './alternar'

describe('alternar', () => {
  it('agrega el valor cuando no estaba', () => {
    expect(alternar(new Set(['a']), 'b')).toEqual(new Set(['a', 'b']))
  })

  it('quita el valor cuando ya estaba', () => {
    expect(alternar(new Set(['a', 'b']), 'b')).toEqual(new Set(['a']))
  })
})
