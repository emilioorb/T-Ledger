import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ComponentType, ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { copy } from '@/features/budget/copy'
import { today, monthStart } from '@/lib/dates'
import { Route } from './presupuesto.index'

vi.mock('@tanstack/react-router', async (original) => ({
  ...(await original<typeof import('@tanstack/react-router')>()),
  createFileRoute: () => (opciones: { component: ComponentType }) => opciones,
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
}))

const MES = monthStart(today()).slice(0, 7)

const respuesta = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { 'content-type': 'application/json' } })

const sinModeloActivo = () =>
  respuesta({ error: { code: 'SEMANTIC_VALIDATION_ERROR', message: 'El libro no tiene un modelo activo' } }, 422)

const montar = () => {
  const Pantalla = (Route as unknown as { component: ComponentType }).component
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <Pantalla />
    </QueryClientProvider>,
  )
}

afterEach(() => vi.restoreAllMocks())

describe('presupuesto sin modelo activo', () => {
  it('ofrece «Declarar ingreso» y al guardar manda un PUT a /budget/income del mes', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url.includes('/budget/evaluation')) return sinModeloActivo()
      if (url.includes('/budget/income/') && init?.method === 'PUT') {
        return respuesta({ period: MES, amount: { minorUnits: '10000000', currency: 'CRC' }, version: 1 })
      }
      if (url.includes('/budget/income/')) return respuesta(null)
      return respuesta([])
    })
    montar()

    expect(await screen.findByText(copy.budget.noModel.title)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: copy.budget.editIncome }))

    fireEvent.change(screen.getByLabelText(copy.budget.income), { target: { value: '100000' } })
    fireEvent.click(screen.getByRole('button', { name: copy.budget.saveIncome }))

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/api/v1/budget/income/${MES}`),
        expect.objectContaining({ method: 'PUT' }),
      ),
    )
  })

  it('sigue mostrando el estado sin modelo después de declarar el ingreso', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url.includes('/budget/evaluation')) return sinModeloActivo()
      if (url.includes('/budget/income/') && init?.method === 'PUT') {
        return respuesta({ period: MES, amount: { minorUnits: '10000000', currency: 'CRC' }, version: 1 })
      }
      if (url.includes('/budget/income/')) return respuesta(null)
      return respuesta([])
    })
    montar()

    fireEvent.click(await screen.findByRole('button', { name: copy.budget.editIncome }))
    fireEvent.change(screen.getByLabelText(copy.budget.income), { target: { value: '100000' } })
    fireEvent.click(screen.getByRole('button', { name: copy.budget.saveIncome }))

    await waitFor(() => expect(screen.queryByLabelText(copy.budget.income)).not.toBeInTheDocument())
    expect(screen.getByText(copy.budget.noModel.title)).toBeInTheDocument()
  })
})
