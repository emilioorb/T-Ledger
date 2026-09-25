import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { copy } from '../copy'
import { Bancos } from './bancos'
import { Categorias } from './categorias'
import { Cierre } from './cierre'
import { FORM_ID } from './intro'
import { Ingreso } from './ingreso'
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

  it('cada moneda es una casilla corta con el símbolo y el nombre completo para el lector', () => {
    render(<Bancos hecho={undefined} onListo={vi.fn()} monedas={['CRC', 'USD']} />)
    const colones = screen.getByRole('checkbox', { name: 'BCR · Colones' })
    expect(colones).toHaveAttribute('aria-checked', 'false')
    expect(colones.closest('label')).toHaveTextContent('₡')
    expect(screen.getByRole('checkbox', { name: 'BCR · Dólares' }).closest('label')).toHaveTextContent('$')
    fireEvent.click(colones.closest('label') as HTMLLabelElement)
    expect(colones).toHaveAttribute('aria-checked', 'true')
  })

  it('con el paso hecho muestra lo creado y no deja editar', () => {
    render(<Bancos hecho={[{ name: 'BN colones', currency: 'CRC', accountCode: '1121', bankAccountId: 'b1' }]} onListo={vi.fn()} monedas={['CRC']} />)
    expect(screen.getByText('BN colones')).toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).toBeNull()
  })

  it('«Otro» no duplica un sugerido que difiere en mayúsculas o espacios', () => {
    render(<Bancos hecho={undefined} onListo={vi.fn()} monedas={['CRC']} />)
    fireEvent.change(screen.getByLabelText(copy.bancos.otro), { target: { value: '  bac   credomatic  ' } })
    fireEvent.click(screen.getByRole('button', { name: copy.bancos.agregar }))
    expect(screen.getAllByText(/bac credomatic/i)).toHaveLength(1)
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

  it('el efectivo no se puede cargar en negativo', () => {
    const onListo = vi.fn()
    render(<Saldos hecho={undefined} onListo={onListo} monedas={['CRC']} bancos={[]} />)
    fireEvent.change(screen.getByLabelText(copy.saldos.caja.CRC), { target: { value: '-1000' } })
    enviar()
    expect(onListo).not.toHaveBeenCalled()
    expect(screen.getByText(copy.saldos.cajaNegativa)).toBeVisible()
  })

  it.each(['₡150000', '150,000', '$1500'])('un monto ilegible (%s) no manda nada y muestra el error', (texto) => {
    const onListo = vi.fn()
    render(<Saldos hecho={undefined} onListo={onListo} monedas={['CRC']} bancos={[]} />)
    fireEvent.change(screen.getByLabelText(copy.saldos.caja.CRC), { target: { value: texto } })
    enviar()
    expect(onListo).not.toHaveBeenCalled()
    expect(screen.getByText(copy.montoIlegible)).toBeVisible()
  })
})

describe('Ingreso', () => {
  it('manda el monto en unidades mínimas', () => {
    const onListo = vi.fn()
    render(<Ingreso hecho={undefined} onListo={onListo} />)
    fireEvent.change(screen.getByLabelText(copy.ingreso.label), { target: { value: '50000' } })
    enviar()
    expect(onListo).toHaveBeenCalledWith({ month: expect.stringMatching(/^\d{4}-\d{2}$/) as string, amount: { minorUnits: '5000000', currency: 'CRC' } })
  })

  it('el monto va en mono, a la derecha y con el símbolo solo visual', () => {
    render(<Ingreso hecho={undefined} onListo={vi.fn()} />)
    const campo = screen.getByLabelText(copy.ingreso.label)
    expect(campo).toHaveClass('num', 'text-right')
    expect(campo).toHaveAttribute('inputmode', 'decimal')
    expect(screen.getByText('₡')).toHaveAttribute('aria-hidden', 'true')
  })

  it('un monto ilegible no manda nada y muestra el error', () => {
    const onListo = vi.fn()
    render(<Ingreso hecho={undefined} onListo={onListo} />)
    fireEvent.change(screen.getByLabelText(copy.ingreso.label), { target: { value: '150,000' } })
    enviar()
    expect(onListo).not.toHaveBeenCalled()
    expect(screen.getByText(copy.montoIlegible)).toBeVisible()
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

describe('Categorias: tipo de la propia', () => {
  it('es un grupo de dos opciones con etiqueta visible, Gasto por defecto', () => {
    render(<Categorias hecho={undefined} onListo={vi.fn()} />)
    const grupo = screen.getByRole('radiogroup', { name: copy.categorias.tipoLabel })
    expect(grupo).toBeVisible()
    expect(screen.getByRole('radio', { name: copy.categorias.tipo.EXPENSE })).toBeChecked()
    expect(screen.getByRole('radio', { name: copy.categorias.tipo.INCOME })).not.toBeChecked()
  })

  it('una propia marcada como Ingreso se manda como INCOME', () => {
    const onListo = vi.fn()
    render(<Categorias hecho={undefined} onListo={onListo} />)
    fireEvent.click(screen.getByRole('radio', { name: copy.categorias.tipo.INCOME }))
    fireEvent.change(screen.getByPlaceholderText(copy.categorias.propiaPlaceholder), { target: { value: 'Alquiler cobrado' } })
    fireEvent.click(screen.getByRole('button', { name: copy.bancos.agregar }))
    enviar()
    const { categories } = onListo.mock.calls[0]![0] as { categories: { name: string; kind: string }[] }
    expect(categories).toContainEqual({ name: 'Alquiler cobrado', kind: 'INCOME' })
  })
})

describe('Cierre', () => {
  it('lista lo creado con las cifras en mono', () => {
    render(<Cierre resumen={{ bancos: 3, categorias: 1, saldos: true, ingreso: false }} />)
    expect(screen.getByText('3')).toHaveClass('num')
    expect(screen.getByText(copy.cierre.resumen.bancos(3))).toBeInTheDocument()
    expect(screen.getByText(copy.cierre.resumen.categorias(1))).toBeInTheDocument()
    expect(screen.getByText(copy.cierre.resumen.saldos)).toBeInTheDocument()
    expect(screen.queryByText(copy.cierre.resumen.ingreso)).toBeNull()
  })

  it('sin nada creado lo dice', () => {
    render(<Cierre resumen={{ bancos: 0, categorias: 0, saldos: false, ingreso: false }} />)
    expect(screen.getByText(copy.cierre.resumen.nada)).toBeInTheDocument()
  })
})
