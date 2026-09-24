import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiFetch, CABECERA_DE_VERSION, ErrorDeRed, esEditadoPorOtro, esReintentar, fetchAlServidor } from './api'

describe('llegar al servidor', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('un fetch que no llega al servidor falla como ErrorDeRed', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))))

    await expect(fetchAlServidor('/api/auth/get-session')).rejects.toBeInstanceOf(ErrorDeRed)
    await expect(apiFetch('/book/mine')).rejects.toBeInstanceOf(ErrorDeRed)
  })

  it('una respuesta de error del servidor no es falta de red', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 502 })))

    const respuesta = await fetchAlServidor('/api/auth/get-session')

    expect(respuesta.status).toBe(502)
    await expect(apiFetch('/book/mine')).rejects.not.toBeInstanceOf(ErrorDeRed)
  })
})

describe('lo que la API necesita saber del cliente', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('cada pedido dice qué versión de la app lo hizo, también el que sube un archivo', async () => {
    const pedido = vi.fn(async () => new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', pedido)

    await apiFetch('/book/mine')
    await apiFetch('/movements/m1/receipt', { method: 'POST', body: new FormData() })

    for (const [, init] of pedido.mock.calls as unknown as [string, RequestInit][]) {
      expect((init.headers as Record<string, string>)[CABECERA_DE_VERSION]).toBe(__APP_VERSION__)
    }
  })

  it('«otro guardó antes» y «probá de nuevo» se distinguen por el código, no por el 409', async () => {
    const respuesta = (code: string) =>
      new Response(JSON.stringify({ error: { code, message: 'x' } }), { status: 409 })
    vi.stubGlobal('fetch', vi.fn(async () => respuesta('EDITADO_POR_OTRO')))
    const editado = await apiFetch('/goals/g1').catch((error: unknown) => error)
    vi.stubGlobal('fetch', vi.fn(async () => respuesta('REINTENTAR')))
    const reintentar = await apiFetch('/goals/g1').catch((error: unknown) => error)

    expect(editado).toBeInstanceOf(ApiError)
    expect([esEditadoPorOtro(editado), esReintentar(editado)]).toEqual([true, false])
    expect([esEditadoPorOtro(reintentar), esReintentar(reintentar)]).toEqual([false, true])
  })
})
