import { describe, expect, it } from 'vitest'
import { FilaDeEscrituras } from './fila-de-escrituras.js'

describe('la fila de escrituras', () => {
  it('un libro admite hasta su tope; al salir uno, entra otro', () => {
    const fila = new FilaDeEscrituras({ porLibro: 2, porPersona: 10 })
    const primera = fila.entrar('casa', 'ana')

    expect(fila.entrar('casa', 'beto')).not.toBeNull()
    expect(fila.entrar('casa', 'ana')).toBeNull()
    primera?.()
    expect(fila.entrar('casa', 'ana')).not.toBeNull()
  })

  it('una persona no ocupa más que su tope aunque reparta entre libros', () => {
    const fila = new FilaDeEscrituras({ porLibro: 10, porPersona: 2 })
    fila.entrar('casa', 'ana')
    fila.entrar('negocio', 'ana')

    expect(fila.entrar('personal', 'ana')).toBeNull()
    expect(fila.entrar('personal', 'beto')).not.toBeNull()
  })

  it('salir dos veces no libera dos lugares', () => {
    const fila = new FilaDeEscrituras({ porLibro: 1, porPersona: 10 })
    const salir = fila.entrar('casa', 'ana')
    fila.entrar('negocio', 'beto')

    salir?.()
    salir?.()
    expect(fila.entrar('casa', 'ana')).not.toBeNull()
    expect(fila.entrar('casa', 'ana')).toBeNull()
  })
})
