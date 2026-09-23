import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorDeCarga } from './error-de-carga'

const invalidate = vi.hoisted(() => vi.fn(async () => {}))
const reportar = vi.hoisted(() => vi.fn())

vi.mock('@/lib/observability', () => ({ reportar }))

vi.mock('@tanstack/react-router', async (original) => ({
  ...(await original<typeof import('@tanstack/react-router')>()),
  useRouter: () => ({ invalidate }),
}))

const sinRed = (sin: boolean) => vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(!sin)

describe('ErrorDeCarga', () => {
  beforeEach(() => {
    invalidate.mockClear()
    reportar.mockClear()
  })
  afterEach(() => vi.restoreAllMocks())

  it('sin red lo dice en castellano, no como un error de la app', () => {
    sinRed(true)

    render(<ErrorDeCarga error={new TypeError('Failed to fetch')} reset={() => {}} />)

    expect(screen.getByRole('heading', { name: 'Sin conexión' })).toBeInTheDocument()
    expect(screen.queryByText('Failed to fetch')).not.toBeInTheDocument()
  })

  it('cuando vuelve la red reintenta solo', () => {
    sinRed(true)
    render(<ErrorDeCarga error={new TypeError('Failed to fetch')} reset={() => {}} />)
    expect(invalidate).not.toHaveBeenCalled()

    act(() => {
      sinRed(false)
      window.dispatchEvent(new Event('online'))
    })

    expect(invalidate).toHaveBeenCalled()
  })

  it('un fetch que no llegó al servidor también es falta de red, aunque el navegador diga que hay', () => {
    sinRed(false)

    render(<ErrorDeCarga error={new TypeError('Failed to fetch')} reset={() => {}} />)

    expect(screen.getByRole('heading', { name: 'Sin conexión' })).toBeInTheDocument()
  })

  it('con red pero sin respuesta no reintenta solo: sería un bucle contra el servidor', () => {
    sinRed(false)

    render(<ErrorDeCarga error={new TypeError('Failed to fetch')} reset={() => {}} />)

    expect(invalidate).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(invalidate).toHaveBeenCalledTimes(1)
  })

  it('cualquier otro error se reintenta a mano', () => {
    sinRed(false)
    render(<ErrorDeCarga error={new Error('boom')} reset={() => {}} />)

    expect(screen.getByRole('heading', { name: 'No se pudo cargar esta pantalla' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(invalidate).toHaveBeenCalled()
  })

  it('reporta los errores de verdad, no los cortes de red', () => {
    sinRed(false)
    const error = new Error('boom')
    const { unmount } = render(<ErrorDeCarga error={error} reset={() => {}} />)
    expect(reportar).toHaveBeenCalledWith(error)
    unmount()
    reportar.mockClear()

    render(<ErrorDeCarga error={new TypeError('Failed to fetch')} reset={() => {}} />)
    expect(reportar).not.toHaveBeenCalled()
  })
})
