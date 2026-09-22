import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CuentaT } from './cuenta-t'

describe('CuentaT', () => {
  it('muestra la glosa de cada asiento', () => {
    render(<CuentaT />)
    expect(screen.getByText(/Gasté 20 mil en el súper/)).toBeInTheDocument()
    expect(screen.getByText(/Me pagaron el salario/)).toBeInTheDocument()
    expect(screen.getByText(/Abono 50 mil a la tarjeta/)).toBeInTheDocument()
  })

  it('pone cada cuenta de su lado', () => {
    render(<CuentaT />)
    expect(screen.getByText('Mercado')).toBeInTheDocument()
    expect(screen.getByText('Efectivo')).toBeInTheDocument()
    expect(screen.getByText('Salario')).toBeInTheDocument()
  })

  it('cierra con los dos totales, y son el mismo', () => {
    render(<CuentaT />)
    expect(screen.getAllByText(/920\s000,00/)).toHaveLength(2)
  })

  it('rotula las dos columnas', () => {
    render(<CuentaT />)
    expect(screen.getByText('Debe')).toBeInTheDocument()
    expect(screen.getByText('Haber')).toBeInTheDocument()
  })
})
