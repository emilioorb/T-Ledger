import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, ErrorDeRed } from '@/lib/api'
import { ErrorDeCarga } from './error-de-carga'

const invalidate = vi.hoisted(() => vi.fn(async () => {}))
const reportar = vi.hoisted(() => vi.fn())

vi.mock('@/lib/observability', () => ({ reportar }))

vi.mock('@tanstack/react-router', async (original) => ({
  ...(await original<typeof import('@tanstack/react-router')>()),
  useRouter: () => ({ invalidate }),
}))

const conRed = (hay: boolean) => vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(hay)

const volverALaRed = () =>
  act(() => {
    conRed(true)
    window.dispatchEvent(new Event('online'))
  })

const cortarLaRed = () =>
  act(() => {
    conRed(false)
    window.dispatchEvent(new Event('offline'))
  })

describe('ErrorDeCarga', () => {
  beforeEach(() => {
    invalidate.mockClear()
    reportar.mockClear()
  })
  afterEach(() => vi.restoreAllMocks())

  it('sin red lo dice en castellano, sin botón, y reintenta sola cuando vuelve', () => {
    conRed(false)
    render(<ErrorDeCarga error={new ErrorDeRed()} reset={() => {}} />)

    expect(screen.getByRole('heading', { name: 'Sin conexión' })).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(invalidate).not.toHaveBeenCalled()

    volverALaRed()

    expect(invalidate).toHaveBeenCalledTimes(1)
    expect(reportar).not.toHaveBeenCalled()
  })

  it('sin red, cualquier error se explica como falta de red', () => {
    conRed(false)

    render(<ErrorDeCarga error={new ApiError(500, 'X', 'boom')} reset={() => {}} />)

    expect(screen.getByRole('heading', { name: 'Sin conexión' })).toBeInTheDocument()
  })

  it('con red pero sin llegar al servidor no promete cargar sola ni reintenta en bucle', () => {
    conRed(true)
    render(<ErrorDeCarga error={new ErrorDeRed()} reset={() => {}} />)

    expect(screen.getByRole('heading', { name: 'No pudimos llegar al servidor' })).toBeInTheDocument()
    expect(invalidate).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(invalidate).toHaveBeenCalledTimes(1)
    expect(reportar).not.toHaveBeenCalled()
  })

  it('un TypeError del código es un error de verdad: se muestra como tal y se reporta', () => {
    conRed(true)
    const error = new TypeError("Cannot read properties of undefined (reading 'map')")

    render(<ErrorDeCarga error={error} reset={() => {}} />)

    expect(screen.getByRole('heading', { name: 'No se pudo cargar esta pantalla' })).toBeInTheDocument()
    expect(reportar).toHaveBeenCalledWith(error)
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(invalidate).toHaveBeenCalled()
  })

  it('reporta cada error una sola vez aunque la red vaya y vuelva', () => {
    conRed(true)
    render(<ErrorDeCarga error={new Error('boom')} reset={() => {}} />)

    cortarLaRed()
    volverALaRed()

    expect(reportar).toHaveBeenCalledTimes(1)
  })

  it('ocupa la pantalla solo cuando falla la raíz; dentro de la app no abre otro main', () => {
    conRed(true)
    const { unmount } = render(<ErrorDeCarga error={new Error('boom')} reset={() => {}} pantallaCompleta />)
    expect(screen.getByRole('main')).toBeInTheDocument()
    unmount()

    render(<ErrorDeCarga error={new Error('boom')} reset={() => {}} />)
    expect(screen.queryByRole('main')).not.toBeInTheDocument()
  })
})
