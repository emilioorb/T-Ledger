import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AvisoSinConexion } from './aviso-sin-conexion'

const conexion = (enLinea: boolean) => {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(enLinea)
  window.dispatchEvent(new Event(enLinea ? 'online' : 'offline'))
}

describe('AvisoSinConexion', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('con conexión no muestra nada', () => {
    render(<AvisoSinConexion />)

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('avisa cuando se corta la red y se va cuando vuelve', () => {
    render(<AvisoSinConexion />)

    act(() => conexion(false))
    expect(screen.getByRole('status')).toHaveTextContent('Sin conexión')

    act(() => conexion(true))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('si la app abre ya sin red, avisa desde el principio', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)

    render(<AvisoSinConexion />)

    expect(screen.getByRole('status')).toHaveTextContent('Sin conexión')
  })
})
