import { describe, expect, it, vi } from 'vitest'
import { cargarParaHidratar, estaRedirigiendo, modoDeArranque } from './modo-de-arranque'

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

describe('estaRedirigiendo', () => {
  it('lee la marca que deja antes-de-pintar.js cuando manda al tablero', () => {
    const raiz = document.createElement('html')
    expect(estaRedirigiendo(raiz)).toBe(false)

    raiz.dataset.redirigiendo = ''
    expect(estaRedirigiendo(raiz)).toBe(true)
  })
})

describe('cargarParaHidratar', () => {
  it('da el visto bueno si el router cargó', async () => {
    expect(await cargarParaHidratar(async () => {}, vi.fn())).toBe(true)
  })

  it('si el router falla, no hidrata y lo reporta en vez de dejar una portada quieta', async () => {
    const reportar = vi.fn()
    const falla = new Error('sin chunk')

    expect(await cargarParaHidratar(async () => Promise.reject(falla), reportar)).toBe(false)
    expect(reportar).toHaveBeenCalledWith(falla)
  })
})
