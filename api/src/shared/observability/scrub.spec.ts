import { describe, expect, it } from 'vitest'
import type { ErrorEvent } from '@sentry/node'
import { scrub } from './scrub.js'

const evento = (extra: Partial<ErrorEvent>): ErrorEvent =>
  ({ event_id: 'a', ...extra }) as ErrorEvent

describe('scrub', () => {
  it('borra el cuerpo de la petición, que es donde viajan los montos', () => {
    const limpio = scrub(
      evento({
        request: {
          url: 'https://api.tape/api/v1/movimientos',
          method: 'POST',
          data: { amount: '4500000', description: 'Pago de la casa' },
        },
      }),
    )

    expect(limpio.request?.data).toBeUndefined()
  })

  it('borra cookies, query y cabeceras salvo las de la lista blanca', () => {
    const limpio = scrub(
      evento({
        request: {
          url: 'https://api.tape/api/v1/movimientos?buscar=alquiler',
          cookies: { session: 'abc' },
          query_string: 'buscar=alquiler',
          headers: { 'content-type': 'application/json', authorization: 'Bearer x' },
        },
      }),
    )

    expect(limpio.request?.cookies).toBeUndefined()
    expect(limpio.request?.query_string).toBeUndefined()
    expect(limpio.request?.headers).toEqual({ 'content-type': 'application/json' })
  })

  it('deja el método y la url, que es lo que sirve para ubicar el error', () => {
    const limpio = scrub(
      evento({ request: { url: 'https://api.tape/api/v1/movimientos', method: 'POST' } }),
    )

    expect(limpio.request?.url).toBe('https://api.tape/api/v1/movimientos')
    expect(limpio.request?.method).toBe('POST')
  })

  it('del usuario deja solo el id', () => {
    const limpio = scrub(
      evento({ user: { id: 'c7f3', email: 'a@b.com', ip_address: '1.2.3.4', username: 'emi' } }),
    )

    expect(limpio.user).toEqual({ id: 'c7f3' })
  })

  it('sin usuario no inventa uno', () => {
    expect(scrub(evento({})).user).toBeUndefined()
  })

  it('borra extra y los datos de las migas, que arrastran cuerpos de petición', () => {
    const limpio = scrub(
      evento({
        extra: { movimiento: { amount: '4500000' } },
        breadcrumbs: [
          { category: 'http', message: 'POST /movimientos', data: { body: { amount: '1' } } },
        ],
      }),
    )

    expect(limpio.extra).toBeUndefined()
    expect(limpio.breadcrumbs?.[0]?.data).toBeUndefined()
    expect(limpio.breadcrumbs?.[0]?.message).toBe('POST /movimientos')
  })

  it('un campo nuevo en el cuerpo no necesita que nadie lo agregue a ninguna lista', () => {
    // Esta es la prueba de que el filtro deniega por defecto. Si algún día falla, es porque
    // alguien lo cambió a una lista de campos prohibidos y la promesa se rompió.
    const limpio = scrub(
      evento({ request: { url: 'u', data: { campoQueNadieAnticipo: 'secreto' } } }),
    )

    expect(JSON.stringify(limpio)).not.toContain('secreto')
  })
})
