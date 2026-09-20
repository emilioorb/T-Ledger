import { describe, expect, it } from 'vitest'
import { err, isErr, isOk, ok, unwrap } from './result.js'

describe('Result', () => {
  it('ok envuelve un valor y lo reconoce como éxito', () => {
    const result = ok(42)
    expect(isOk(result)).toBe(true)
    expect(unwrap(result)).toBe(42)
  })

  it('err envuelve un error y lo reconoce como fallo', () => {
    const result = err(new RangeError('fuera de rango'))
    expect(isErr(result)).toBe(true)
    expect(isOk(result)).toBe(false)
  })

  it('unwrap sobre un err lanza el error contenido', () => {
    expect(() => unwrap(err(new RangeError('fuera de rango')))).toThrow(RangeError)
  })
})
