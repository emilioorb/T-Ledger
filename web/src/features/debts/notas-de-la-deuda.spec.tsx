import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { copy } from './copy'
import { NotasDeLaDeuda } from './notas-de-la-deuda'

const abrir = async (notes: string | null, hasDocument: boolean) => {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <NotasDeLaDeuda debtId="conape" notes={notes} hasDocument={hasDocument} version={0} />
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

  describe('al guardar', () => {
    afterEach(() => vi.unstubAllGlobals())

    it('manda la versión de cuando empezó a editar, aunque una recarga traiga otra', async () => {
      const pedido = vi.fn(async () => new Response('{}', { status: 200 }))
      vi.stubGlobal('fetch', pedido)
      const cliente = new QueryClient()
      const notas = (version: number) => (
        <QueryClientProvider client={cliente}>
          <NotasDeLaDeuda debtId="conape" notes="Tasa fija" hasDocument={false} version={version} />
        </QueryClientProvider>
      )
      const { rerender } = render(notas(1))
      fireEvent.click(screen.getByRole('button', { name: copy.notas.open }))
      fireEvent.click(screen.getByRole('button', { name: copy.notas.edit }))

      rerender(notas(2))
      fireEvent.click(screen.getByRole('button', { name: copy.notas.save }))

      await vi.waitFor(() => expect(pedido).toHaveBeenCalled())
      const [, init] = pedido.mock.calls[0] as unknown as [string, RequestInit]
      expect(JSON.parse(String(init.body))).toMatchObject({ version: 1 })
    })
  })
})

