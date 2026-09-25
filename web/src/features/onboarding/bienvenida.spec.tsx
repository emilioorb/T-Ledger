import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Bienvenida from './bienvenida'
import { copy } from './copy'

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }))

const respuesta = (cuerpo: unknown, status = 200) =>
  new Response(status === 204 ? null : JSON.stringify(cuerpo), { status, headers: { 'content-type': 'application/json' } })

const montar = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <Bienvenida />
    </QueryClientProvider>,
  )

afterEach(() => vi.restoreAllMocks())

const conEstado = (estado: object, alPost: (url: string) => Promise<Response> = async () => respuesta(null, 204)) =>
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) =>
    init?.method === 'POST' ? alPost(String(url)) : respuesta(estado),
  )

describe('Bienvenida', () => {
  it('no se abre si no está pendiente', async () => {
    const fetch = conEstado({ pending: false, bookId: 'b1', steps: {} })
    montar()
    await waitFor(() => expect(fetch).toHaveBeenCalled())
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('pendiente: se abre, la marca y manda los pasos al libro en que se abrió', async () => {
    const fetch = conEstado({ pending: true, bookId: 'b1', steps: {} })
    montar()
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/onboarding/start'), expect.objectContaining({ method: 'POST', headers: expect.objectContaining({ 'x-libro': 'b1' }) })),
    )
  })

  it('saltear no llama a nada', async () => {
    const fetch = conEstado({ pending: true, bookId: 'b1', steps: {} })
    montar()
    fireEvent.click(await screen.findByRole('button', { name: copy.botones.empezar }))
    fireEvent.click(screen.getByRole('button', { name: copy.botones.siguiente })) // monedas no llama
    const antes = fetch.mock.calls.length
    fireEvent.click(screen.getByRole('button', { name: copy.botones.saltear })) // bancos
    expect(fetch.mock.calls.length).toBe(antes)
    expect(screen.getByRole('heading', { name: copy.saldos.title })).toBeInTheDocument()
  })

  it('cerrar pide confirmación', async () => {
    conEstado({ pending: true, bookId: 'b1', steps: {} })
    montar()
    await screen.findByRole('dialog')
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })
    expect(await screen.findByText(copy.cerrar.description)).toBeInTheDocument()
  })

  it('un error de red deja el paso con reintentar', async () => {
    conEstado({ pending: true, bookId: 'b1', steps: {} }, async (url) => {
      if (url.includes('/banks')) throw new TypeError('red')
      return respuesta(null, 204)
    })
    montar()
    fireEvent.click(await screen.findByRole('button', { name: copy.botones.empezar }))
    fireEvent.click(screen.getByRole('button', { name: copy.botones.siguiente }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'BN · Colones' }))
    fireEvent.click(screen.getByRole('button', { name: copy.botones.siguiente }))
    expect(await screen.findByRole('button', { name: copy.botones.reintentar })).toBeInTheDocument()
  })

  it('recorre monedas, salteando bancos, saldos y categorías, hasta declarar el ingreso y llegar al cierre', async () => {
    const fetch = conEstado({ pending: true, bookId: 'b1', steps: {} }, async (url) =>
      url.includes('/income') ? respuesta({ month: '2026-09', amount: { minorUnits: '5000000', currency: 'CRC' } }, 201) : respuesta(null, 204),
    )
    montar()
    fireEvent.click(await screen.findByRole('button', { name: copy.botones.empezar }))

    fireEvent.click(screen.getByRole('radio', { name: copy.monedas.ambas }))
    fireEvent.click(screen.getByRole('button', { name: copy.botones.siguiente })) // monedas -> bancos

    fireEvent.click(screen.getByRole('button', { name: copy.botones.saltear })) // bancos -> saldos
    fireEvent.click(screen.getByRole('button', { name: copy.botones.saltear })) // saldos -> categorias
    fireEvent.click(screen.getByRole('button', { name: copy.botones.saltear })) // categorias -> ingreso

    expect(screen.getByRole('heading', { name: copy.ingreso.title })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(copy.ingreso.label), { target: { value: '50000' } })
    fireEvent.click(screen.getByRole('button', { name: copy.botones.siguiente })) // ingreso -> cierre

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/onboarding/income'), expect.objectContaining({ method: 'POST' })),
    )
    expect(await screen.findByRole('heading', { name: copy.cierre.title })).toBeInTheDocument()
    expect(screen.getByText(copy.cierre.resumen.ingreso)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: copy.cierre.guia })).toBeInTheDocument()
  })
})
