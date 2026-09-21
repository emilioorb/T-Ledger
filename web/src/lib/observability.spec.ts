import { describe, expect, it } from 'vitest'
import type { ErrorEvent } from '@sentry/react'
import { scrub } from './observability'

const evento = (extra: Partial<ErrorEvent>): ErrorEvent =>
  ({ event_id: 'a', ...extra }) as ErrorEvent

describe('scrub del front', () => {
  it('borra el cuerpo y deja url y método', () => {
    const limpio = scrub(
      evento({ request: { url: '/movimientos', method: 'POST', data: { amount: '4500000' } } }),
    )

    expect(limpio.request?.data).toBeUndefined()
    expect(limpio.request?.url).toBe('/movimientos')
    expect(limpio.request?.method).toBe('POST')
  })

  it('del usuario deja solo el id', () => {
    const limpio = scrub(evento({ user: { id: 'c7f3', email: 'a@b.com', username: 'emi' } }))

    expect(limpio.user).toEqual({ id: 'c7f3' })
  })

  it('borra los datos de las migas, que en el navegador guardan lo que se escribió', () => {
    const limpio = scrub(
      evento({
        breadcrumbs: [{ category: 'ui.input', message: 'monto', data: { value: '4500000' } }],
      }),
    )

    expect(limpio.breadcrumbs?.[0]?.data).toBeUndefined()
    expect(limpio.breadcrumbs?.[0]?.message).toBe('monto')
  })

  it('un campo nuevo no necesita que nadie lo agregue a ninguna lista', () => {
    const limpio = scrub(
      evento({ request: { url: 'u', data: { campoQueNadieAnticipo: 'secreto' } } }),
    )

    expect(JSON.stringify(limpio)).not.toContain('secreto')
  })
})
