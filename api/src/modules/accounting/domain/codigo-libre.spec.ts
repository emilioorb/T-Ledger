import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '../../../shared/kernel/result.js'
import { siguienteCodigoLibre } from './codigo-libre.js'

const libre = (ocupados: string[], desde: number, hasta: number) => {
  const resultado = siguienteCodigoLibre(new Set(ocupados), desde, hasta)
  if (!isOk(resultado)) throw resultado.error
  return resultado.value
}

describe('siguienteCodigoLibre', () => {
  it('sin nada ocupado da el primero del rango', () => {
    expect(libre([], 1121, 1189)).toBe('1121')
  })

  it('salta los ocupados y usa el primer hueco', () => {
    expect(libre(['1121', '1122', '1124'], 1121, 1189)).toBe('1123')
  })

  it('cuenta como ocupado un código aunque cuelgue de otra madre', () => {
    // La clave es libro más código: una 1121 de cualquier rama ya lo toma.
    expect(libre(['1121'], 1121, 1189)).toBe('1122')
  })

  it('con el rango lleno devuelve error', () => {
    const todos = Array.from({ length: 3 }, (_, i) => String(6201 + i))
    const resultado = siguienteCodigoLibre(new Set(todos), 6201, 6203)
    expect(isErr(resultado)).toBe(true)
  })
})
