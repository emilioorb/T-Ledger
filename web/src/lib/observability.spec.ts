import * as Sentry from '@sentry/react'
import type { ErrorEvent } from '@sentry/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './api'
import { iniciarObservabilidad, scrub, sinTextoDelServidor } from './observability'

vi.mock('@sentry/react', async (original) => ({
  ...(await original<typeof import('@sentry/react')>()),
  init: vi.fn(),
}))

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

describe('la url del evento', () => {
  it('pierde la query, que puede llevar fechas, montos o búsquedas', () => {
    const limpio = scrub(
      evento({ request: { url: 'https://t-ledger.vercel.app/contabilidad/mayor?desde=2026-01-01&q=salario' } }),
    )

    expect(limpio.request?.url).toBe('https://t-ledger.vercel.app/contabilidad/mayor')
  })
})

describe('un error de la API', () => {
  const conError = (valor: string): ErrorEvent =>
    evento({ exception: { values: [{ type: 'ApiError', value: valor }] } })

  it('se reporta por código y estado, sin el texto que mandó el servidor', () => {
    const error = new ApiError(422, 'VALIDATION_ERROR', 'El nombre «Préstamo de mamá» ya existe')

    const limpio = sinTextoDelServidor(conError(error.message), { originalException: error })

    expect(limpio.exception?.values?.[0]?.value).toBe('VALIDATION_ERROR (422)')
    expect(JSON.stringify(limpio)).not.toContain('mamá')
  })

  it('cualquier otro error conserva su mensaje, que sale del código y no de los datos', () => {
    const limpio = sinTextoDelServidor(conError('x is undefined'), {
      originalException: new TypeError('x is undefined'),
    })

    expect(limpio.exception?.values?.[0]?.value).toBe('x is undefined')
  })
})

describe('iniciarObservabilidad', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.mocked(Sentry.init).mockClear()
  })

  it('no suma las integraciones por defecto: sin migas, que guardan lo que se escribió y se hizo', () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://clave@o1.ingest.us.sentry.io/1')

    iniciarObservabilidad()

    const opciones = vi.mocked(Sentry.init).mock.calls[0]?.[0]
    expect(opciones?.defaultIntegrations).toBe(false)
    const nombres = (opciones?.integrations as { name: string }[]).map((i) => i.name)
    expect(nombres).toContain('GlobalHandlers')
    expect(nombres).not.toContain('Breadcrumbs')
    expect(nombres).not.toContain('BrowserSession')
  })
})
