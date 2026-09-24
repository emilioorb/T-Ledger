import { describe, expect, it } from 'vitest'
import { autorDeLaPeticion, exigirAutor, SinAutorError } from './autor-de-la-peticion.js'

// Que el autor llegue de verdad al gancho de organización se prueba de punta a punta en
// `sacar-miembro.e2e.spec.ts`, contra Better Auth: un test que simula la cadena asíncrona acá
// daba verde mientras en producción sacar a alguien daba 500.
describe('autor de la petición', () => {
  it('fuera de una petición de Better Auth no hay autor', () => {
    expect(autorDeLaPeticion()).toBeUndefined()
  })

  it('exigir el autor sin autor corta en vez de inventarlo, y dice qué se quiso hacer', () => {
    expect(() => exigirAutor('sacar a alguien del libro')).toThrow(SinAutorError)
    expect(() => exigirAutor('sacar a alguien del libro')).toThrow(/sacar a alguien del libro/)
  })
})
