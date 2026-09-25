import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { queryKeys } from '@/lib/query-keys'
import Bienvenida from './bienvenida'
import { copy } from './copy'

const { navegar } = vi.hoisted(() => ({ navegar: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navegar }))

const respuesta = (cuerpo: unknown, status = 200) =>
  new Response(status === 204 ? null : JSON.stringify(cuerpo), { status, headers: { 'content-type': 'application/json' } })

const montar = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <Bienvenida />
    </QueryClientProvider>,
  )
  return client
}

afterEach(() => {
  vi.restoreAllMocks()
  navegar.mockClear()
})

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

  it('saltar no llama a nada', async () => {
    const fetch = conEstado({ pending: true, bookId: 'b1', steps: {} })
    montar()
    fireEvent.click(await screen.findByRole('button', { name: copy.botones.empezar }))
    fireEvent.click(screen.getByRole('button', { name: copy.botones.siguiente })) // monedas no llama
    const antes = fetch.mock.calls.length
    fireEvent.click(screen.getByRole('button', { name: copy.botones.saltar })) // bancos
    expect(fetch.mock.calls.length).toBe(antes)
    expect(screen.getByRole('heading', { name: copy.saldos.title })).toBeInTheDocument()
  })

  it('«Siguiente» en Monedas deja Bancos en pantalla', async () => {
    conEstado({ pending: true, bookId: 'b1', steps: {} })
    montar()
    fireEvent.click(await screen.findByRole('button', { name: copy.botones.empezar }))
    const siguiente = screen.getByRole('button', { name: copy.botones.siguiente })
    fireEvent.click(siguiente)
    expect(screen.getByRole('heading', { name: copy.bancos.title })).toBeInTheDocument()
    // En el navegador React re-renderiza antes de la acción por defecto del mismo clic: si el
    // botón tocado pasa a ser el envío de Bancos, manda el formulario vacío y salta el paso.
    // jsdom corre esa acción antes del re-render, así que se comprueba que no sea el mismo nodo.
    expect(siguiente).not.toHaveAttribute('type', 'submit')
  })

  it('de un paso con formulario al siguiente, el envío es otro botón y no se manda nada solo', async () => {
    const fetch = conEstado({ pending: true, bookId: 'b1', steps: {} }, async (url) =>
      url.includes('/banks')
        ? respuesta([{ name: 'BN colones', currency: 'CRC', accountCode: '1121', bankAccountId: 'x1' }], 201)
        : respuesta(null, 204),
    )
    montar()
    fireEvent.click(await screen.findByRole('button', { name: copy.botones.empezar }))
    fireEvent.click(screen.getByRole('button', { name: copy.botones.siguiente })) // monedas -> bancos
    fireEvent.click(screen.getByRole('checkbox', { name: 'BN · Colones' }))
    const enviarBancos = screen.getByRole('button', { name: copy.botones.siguiente })
    fireEvent.click(enviarBancos)

    expect(await screen.findByRole('heading', { name: copy.saldos.title })).toBeInTheDocument()
    // Con la misma `key` React reusaría el <button> de Bancos como el envío de Saldos.
    expect(enviarBancos.isConnected).toBe(false)
    expect(screen.getByRole('button', { name: copy.botones.siguiente })).toHaveAttribute('type', 'submit')
    expect(fetch.mock.calls.filter(([url]) => String(url).includes('/opening-balances'))).toHaveLength(0)
  })

  it('el progreso dice en qué paso está, también al lector de pantalla', async () => {
    conEstado({ pending: true, bookId: 'b1', steps: {} })
    montar()
    expect(await screen.findByRole('progressbar', { name: copy.progreso })).toHaveAttribute('aria-valuenow', '1')
    fireEvent.click(screen.getByRole('button', { name: copy.botones.empezar }))
    const progreso = screen.getByRole('progressbar', { name: copy.progreso })
    expect(progreso).toHaveAttribute('aria-valuenow', '2')
    expect(progreso).toHaveAttribute('aria-valuetext', copy.pasoDe(2, 7))
  })

  it('al abrir, el foco va al título del paso', async () => {
    conEstado({ pending: true, bookId: 'b1', steps: {} })
    montar()
    const titulo = await screen.findByRole('heading', { name: copy.intro.title })
    await waitFor(() => expect(titulo).toHaveFocus())
  })

  it('la cruz de cerrar pide confirmación', async () => {
    conEstado({ pending: true, bookId: 'b1', steps: {} })
    montar()
    fireEvent.click(await screen.findByRole('button', { name: copy.botones.cerrar }))
    expect(await screen.findByText(copy.cerrar.description)).toBeInTheDocument()
  })

  it('tocar el fondo alrededor del panel pide confirmación', async () => {
    conEstado({ pending: true, bookId: 'b1', steps: {} })
    montar()
    fireEvent.pointerDown(await screen.findByRole('dialog'))
    expect(await screen.findByText(copy.cerrar.description)).toBeInTheDocument()
  })

  it('tocar adentro del panel no pide confirmación', async () => {
    conEstado({ pending: true, bookId: 'b1', steps: {} })
    montar()
    fireEvent.pointerDown(await screen.findByRole('heading', { name: copy.intro.title }))
    expect(screen.queryByText(copy.cerrar.description)).toBeNull()
  })

  it('cerrar pide confirmación', async () => {
    conEstado({ pending: true, bookId: 'b1', steps: {} })
    montar()
    await screen.findByRole('dialog')
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })
    expect(await screen.findByText(copy.cerrar.description)).toBeInTheDocument()
  })

  it('confirmar cerrar: el diálogo no vuelve a aparecer y start se llamó una sola vez', async () => {
    const fetch = conEstado({ pending: true, bookId: 'b1', steps: {} })
    const client = montar()
    await screen.findByRole('dialog')
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })
    fireEvent.click(await screen.findByRole('button', { name: copy.cerrar.confirmar }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(client.getQueryData(queryKeys.onboarding.status())).toMatchObject({ pending: false })
    // Nada volvió a marcar la bienvenida como pendiente: aunque el componente siga montado,
    // el efecto de apertura no se repite.
    await waitFor(() =>
      expect(fetch.mock.calls.filter(([url]) => String(url).includes('/onboarding/start'))).toHaveLength(1),
    )
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('leer la guía: navega, cierra el diálogo y no vuelve a aparecer', async () => {
    conEstado({ pending: true, bookId: 'b1', steps: {} })
    const client = montar()
    fireEvent.click(await screen.findByRole('button', { name: copy.botones.empezar })) // intro -> monedas
    fireEvent.click(screen.getByRole('button', { name: copy.botones.siguiente })) // monedas -> bancos
    fireEvent.click(screen.getByRole('button', { name: copy.botones.saltar })) // bancos -> saldos
    fireEvent.click(screen.getByRole('button', { name: copy.botones.saltar })) // saldos -> categorias
    fireEvent.click(screen.getByRole('button', { name: copy.botones.saltar })) // categorias -> ingreso
    fireEvent.click(screen.getByRole('button', { name: copy.botones.saltar })) // ingreso -> cierre

    fireEvent.click(await screen.findByRole('button', { name: copy.cierre.guia }))

    expect(navegar).toHaveBeenCalledWith({ to: '/guia' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(client.getQueryData(queryKeys.onboarding.status())).toMatchObject({ pending: false })
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

  it('recorre monedas, saltando bancos, saldos y categorías, hasta declarar el ingreso y llegar al cierre', async () => {
    const fetch = conEstado({ pending: true, bookId: 'b1', steps: {} }, async (url) =>
      url.includes('/income') ? respuesta({ month: '2026-09', amount: { minorUnits: '5000000', currency: 'CRC' } }, 201) : respuesta(null, 204),
    )
    montar()
    fireEvent.click(await screen.findByRole('button', { name: copy.botones.empezar }))

    fireEvent.click(screen.getByRole('radio', { name: copy.monedas.ambas }))
    fireEvent.click(screen.getByRole('button', { name: copy.botones.siguiente })) // monedas -> bancos

    fireEvent.click(screen.getByRole('button', { name: copy.botones.saltar })) // bancos -> saldos
    fireEvent.click(screen.getByRole('button', { name: copy.botones.saltar })) // saldos -> categorias
    fireEvent.click(screen.getByRole('button', { name: copy.botones.saltar })) // categorias -> ingreso

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
