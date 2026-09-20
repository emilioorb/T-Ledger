import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AmortizationTable } from './amortization-table'

const crc = (minorUnits: string) => ({ minorUnits, currency: 'CRC' as const })

const installments = [
  { number: 1, dueDate: '2026-02-15', payment: crc('3400221'), principal: crc('3300221'), interest: crc('100000'), balance: crc('6699779') },
  { number: 2, dueDate: '2026-03-15', payment: crc('3400221'), principal: crc('3333223'), interest: crc('66998'), balance: crc('3366556') },
  { number: 3, dueDate: '2026-04-15', payment: crc('3400222'), principal: crc('3366556'), interest: crc('33666'), balance: crc('0') },
]

describe('AmortizationTable', () => {
  it('muestra una fila por cuota con el monto formateado', () => {
    render(<AmortizationTable installments={installments} />)
    expect(screen.getAllByRole('row')).toHaveLength(installments.length + 1)
    expect(screen.getAllByText(/34\s002,21/).length).toBeGreaterThan(0)
  })

  it('marca la última cuota, que es la que absorbe el residuo', () => {
    render(<AmortizationTable installments={installments} />)
    expect(screen.getAllByText(/34\s002,22/).length).toBeGreaterThan(0)
  })

  it('expone la tabla con encabezados accesibles', () => {
    render(<AmortizationTable installments={installments} />)
    expect(screen.getAllByRole('columnheader').length).toBeGreaterThan(0)
  })

  it('no rompe con una tabla vacía', () => {
    render(<AmortizationTable installments={[]} />)
    expect(screen.getByRole('table')).toBeInTheDocument()
  })
})
