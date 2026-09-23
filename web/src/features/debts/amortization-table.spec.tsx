import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AmortizationTable } from './amortization-table'
import { copy } from './copy'

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

describe('AmortizationTable de una deuda real', () => {
  const conEstado = [
    { ...installments[0]!, status: 'PAID' as const, paidOn: '2026-02-14', withMovement: true },
    { ...installments[1]!, status: 'OVERDUE' as const, paidOn: null, withMovement: false },
    { ...installments[2]!, status: 'PENDING' as const, paidOn: null, withMovement: false },
  ]

  it('dice de cada cuota si está pagada o atrasada', () => {
    render(<AmortizationTable installments={conEstado} />)
    expect(screen.getAllByText(copy.schedule.status.PAID).length).toBeGreaterThan(0)
    expect(screen.getAllByText(copy.schedule.status.OVERDUE).length).toBeGreaterThan(0)
  })

  it('marca la que sigue: la primera sin pagar', () => {
    render(<AmortizationTable installments={conEstado} />)
    // La segunda está atrasada: esa es la que sigue, aunque haya vencido.
    expect(screen.getAllByText(copy.schedule.status.next).length).toBeGreaterThan(0)
  })

  it('una simulación, sin estados, no muestra la columna', () => {
    render(<AmortizationTable installments={installments} />)
    expect(screen.queryByText(copy.schedule.columns.status)).toBeNull()
  })
})
