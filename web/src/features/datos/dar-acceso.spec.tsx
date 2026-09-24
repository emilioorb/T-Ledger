import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { copy } from './copy'
import { DarAcceso } from './dar-acceso'

const respuesta = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { 'content-type': 'application/json' } })

const montar = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <DarAcceso />
    </QueryClientProvider>,
  )

afterEach(() => vi.restoreAllMocks())

describe('DarAcceso', () => {
  it('después de invitar muestra el enlace con el correo y el token en el fragmento', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) =>
      init?.method === 'POST'
        ? respuesta(
            { id: 'inv-1', email: 'ana@correo.cr', expiresAt: '2026-09-30T13:00:00.000Z', token: 'tok-1' },
            201,
          )
        : respuesta([]),
    )
    montar()

    fireEvent.change(screen.getByLabelText(copy.acceso.email), { target: { value: 'ana@correo.cr' } })
    fireEvent.click(screen.getByRole('button', { name: copy.acceso.submit }))

    const enlace = await screen.findByLabelText(copy.acceso.linkLabel)
    expect(enlace).toHaveValue(`${window.location.origin}/crear-cuenta?correo=ana%40correo.cr#token=tok-1`)
  })

  it('una invitación pendiente da un enlace nuevo, pedido al servidor', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) =>
      init?.method === 'POST'
        ? respuesta({ token: 'tok-nuevo' })
        : respuesta([{ id: 'inv-3', email: 'eva@correo.cr', expiresAt: '2026-09-30T13:00:00.000Z' }]),
    )
    montar()

    fireEvent.click(await screen.findByRole('button', { name: copy.acceso.renew }))

    const enlace = await screen.findByLabelText(copy.acceso.linkLabel)
    expect(enlace).toHaveValue(`${window.location.origin}/crear-cuenta?correo=eva%40correo.cr#token=tok-nuevo`)
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/admin/invitations/inv-3/link'),
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('lista las invitaciones que esperan registro', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      respuesta([{ id: 'inv-2', email: 'luis@correo.cr', expiresAt: '2026-09-30T13:00:00.000Z' }]),
    )
    montar()

    await waitFor(() => expect(screen.getByText('luis@correo.cr')).toBeInTheDocument())
  })
})
