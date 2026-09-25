import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { copy } from '../copy'
import { Bancos } from './bancos'
import { Categorias } from './categorias'
import { FORM_ID } from './intro'
import { Saldos } from './saldos'

const enviar = () => fireEvent.submit(document.getElementById(FORM_ID) as HTMLFormElement)

describe('Bancos', () => {
  it('con solo colones no ofrece dólares', () => {
    render(<Bancos hecho={undefined} onListo={vi.fn()} monedas={['CRC']} />)
    expect(screen.queryByRole('checkbox', { name: new RegExp(copy.bancos.moneda.USD) })).toBeNull()
  })

  it('arma el pedido con los bancos marcados en cada moneda', () => {
    const onListo = vi.fn()
    render(<Bancos hecho={undefined} onListo={onListo} monedas={['CRC', 'USD']} />)
    fireEvent.click(screen.getByRole('checkbox', { name: 'BAC Credomatic · Colones' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'BAC Credomatic · Dólares' }))
    enviar()
    expect(onListo).toHaveBeenCalledWith({
      banks: [
        { name: 'BAC Credomatic', currency: 'CRC' },
        { name: 'BAC Credomatic', currency: 'USD' },
      ],
    })
  })

  it('con el paso hecho muestra lo creado y no deja editar', () => {
    render(<Bancos hecho={[{ name: 'BN colones', currency: 'CRC', accountCode: '1121', bankAccountId: 'b1' }]} onListo={vi.fn()} monedas={['CRC']} />)
    expect(screen.getByText('BN colones')).toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).toBeNull()
  })
})

describe('Saldos', () => {
  it('manda los montos en unidades mínimas y omite los vacíos', () => {
    const onListo = vi.fn()
    render(
      <Saldos
        hecho={undefined}
        onListo={onListo}
        monedas={['CRC']}
        bancos={[{ name: 'BAC colones', currency: 'CRC', accountCode: '1121', bankAccountId: 'b1' }]}
      />,
    )
    fireEvent.change(screen.getByLabelText('BAC colones'), { target: { value: '-1500' } })
    enviar()
    expect(onListo).toHaveBeenCalledWith({
      date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      balances: [{ accountCode: '1121', amount: '-150000' }],
    })
  })
})

describe('Categorias', () => {
  it('trae las sugeridas marcadas y suma las propias', () => {
    const onListo = vi.fn()
    render(<Categorias hecho={undefined} onListo={onListo} />)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Educación' }))
    fireEvent.change(screen.getByPlaceholderText(copy.categorias.propiaPlaceholder), { target: { value: 'Mascotas' } })
    fireEvent.click(screen.getByRole('button', { name: copy.bancos.agregar }))
    enviar()
    const { categories } = onListo.mock.calls[0]![0] as { categories: { name: string }[] }
    expect(categories.map((categoria) => categoria.name)).toContain('Mascotas')
    expect(categories.map((categoria) => categoria.name)).not.toContain('Educación')
  })
})
