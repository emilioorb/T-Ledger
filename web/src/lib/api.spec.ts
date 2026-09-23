import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiFetch, ErrorDeRed, fetchAlServidor } from './api'

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
