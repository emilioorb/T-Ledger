import { describe, expect, it } from 'vitest'
import { destinoPropio } from './destino'

describe('destinoPropio', () => {
  it('acepta rutas de la app, con su búsqueda', () => {
    expect(destinoPropio('/tablero')).toBe('/tablero')
    expect(destinoPropio('/unirse?invitacion=inv-1')).toBe('/unirse?invitacion=inv-1')
  })

  it('rechaza lo que podría sacar a otro sitio', () => {
    for (const afuera of ['//otro.com', '/\\otro.com', 'https://otro.com', 'javascript:alert(1)', 'tablero', '', 42]) {
      expect(destinoPropio(afuera)).toBeUndefined()
    }
  })
})
