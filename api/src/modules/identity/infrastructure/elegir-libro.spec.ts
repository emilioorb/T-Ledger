import { describe, expect, it } from 'vitest'
import { elegirLibro, type Membresia } from './elegir-libro.js'

const casa: Membresia = { organizationId: 'lib_casa', role: 'owner' }
const negocio: Membresia = { organizationId: 'lib_negocio', role: 'editor' }

// Esto decide a qué libro se atribuye cada petición. Equivocarse acá no da un error: da las
// cifras de un libro bajo el nombre de otro, que es el peor error posible en este producto y
// el único que nadie reporta, porque no se ve.
describe('en qué libro corre la petición', () => {
  it('manda lo que pidió la pantalla', () => {
    const elegido = elegirLibro({ pedido: 'lib_negocio', activo: 'lib_casa', suyas: [casa, negocio] })

    expect(elegido).toEqual(negocio)
  })

  it('pedir un libro ajeno no devuelve otro en su lugar', () => {
    expect(elegirLibro({ pedido: 'lib_de_otro', activo: 'lib_casa', suyas: [casa] })).toBeNull()
  })

  it('sin cabecera, el que dice la sesión', () => {
    expect(elegirLibro({ pedido: undefined, activo: 'lib_negocio', suyas: [casa, negocio] })).toEqual(
      negocio,
    )
  })

  it('si el activo ya no es suyo, no cae en otro', () => {
    // Pasa cuando a alguien lo sacan del libro que tenía abierto.
    expect(elegirLibro({ pedido: undefined, activo: 'lib_viejo', suyas: [casa] })).toBeNull()
  })

  it('sin cabecera ni activo, el único que tenga', () => {
    expect(elegirLibro({ pedido: undefined, activo: null, suyas: [casa] })).toEqual(casa)
  })

  it('sin cabecera ni activo y con varios, ninguno', () => {
    // Elegir «el primero» sería mostrar las cifras de un libro con el nombre de otro.
    expect(elegirLibro({ pedido: undefined, activo: null, suyas: [casa, negocio] })).toBeNull()
  })

  it('sin libros, ninguno', () => {
    expect(elegirLibro({ pedido: undefined, activo: null, suyas: [] })).toBeNull()
  })
})
