import { describe, expect, it } from 'vitest'
import { modoDeArranque } from './modo-de-arranque'

const PORTADA = { traePortada: true, ruta: '/', estado: 'success' } as const

describe('modoDeArranque', () => {
  it('hidrata la portada prerenderizada cuando el router terminó en ella', () => {
    expect(modoDeArranque(PORTADA)).toBe('hidratar')
  })

  it('crea desde cero cuando el HTML no trae la portada: app.html', () => {
    expect(modoDeArranque({ ...PORTADA, traePortada: false })).toBe('crear')
  })

  it('crea desde cero si el router redirigió, aunque el HTML traiga la portada', () => {
    expect(modoDeArranque({ ...PORTADA, estado: 'redirected' })).toBe('crear')
    expect(modoDeArranque({ ...PORTADA, ruta: '/tablero' })).toBe('crear')
  })

  it('crea desde cero si la portada terminó en error: el árbol no sería el del HTML', () => {
    expect(modoDeArranque({ ...PORTADA, estado: 'error' })).toBe('crear')
    expect(modoDeArranque({ ...PORTADA, estado: 'notFound' })).toBe('crear')
  })
})
