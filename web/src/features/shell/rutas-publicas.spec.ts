import { describe, expect, it } from 'vitest'
import { esPublica } from './rutas-publicas'

describe('esPublica', () => {
  it('unirse es pública: si mandara a entrar, el token del enlace terminaría en la query', () => {
    expect(esPublica('/unirse')).toBe(true)
  })

  it('las pantallas del libro piden sesión', () => {
    expect(esPublica('/tablero')).toBe(false)
    expect(esPublica('/metas')).toBe(false)
  })
})
