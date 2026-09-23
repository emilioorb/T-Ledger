import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { copy } from './copy'
import { NotasDeLaDeuda } from './notas-de-la-deuda'

const abrir = async (notes: string | null, hasDocument: boolean) => {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <NotasDeLaDeuda debtId="conape" notes={notes} hasDocument={hasDocument} />
    </QueryClientProvider>,
  )
  fireEvent.click(screen.getByRole('button', { name: copy.notas.open }))
}

describe('NotasDeLaDeuda', () => {
  it('muestra las notas con formato', async () => {
    await abrir('## Tasa\nEs **variable**.', false)
    expect(screen.getByRole('heading', { name: 'Tasa' })).toBeInTheDocument()
    expect(screen.getByText('variable').tagName).toBe('STRONG')
  })

  it('sin notas lo dice, en vez de mostrar un cuadro vacío', async () => {
    await abrir(null, false)
    expect(screen.getByText(copy.notas.empty)).toBeInTheDocument()
  })

  it('con contrato adjunto ofrece verlo', async () => {
    await abrir(null, true)
    expect(screen.getByRole('link', { name: copy.notas.document.view })).toHaveAttribute(
      'href',
      '/api/v1/debts/conape/document',
    )
  })
})
