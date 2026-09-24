import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { copy } from './copy'
import { LaGente } from './la-gente'

vi.mock('@/features/identity/auth-client', () => ({
  organization: {
    listInvitations: vi.fn(async () => ({
      data: [
        { id: 'inv-2', email: 'eva@correo.cr', status: 'pending', expiresAt: '2026-09-30T13:00:00.000Z' },
        { id: 'inv-3', email: 'luis@correo.cr', status: 'pending', expiresAt: '2026-09-30T13:00:00.000Z' },
      ],
      error: null,
    })),
  },
}))

const respuesta = (cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), { status: 200, headers: { 'content-type': 'application/json' } })

const montar = (puedoAdministrar = true) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <LaGente miembros={[]} soyYo="usr-1" puedoAdministrar={puedoAdministrar} />
    </QueryClientProvider>,
  )

afterEach(() => vi.restoreAllMocks())

describe('las invitaciones pendientes del libro', () => {
  it('«Enlace nuevo» pide uno al servidor y lo muestra bajo esa invitación', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(respuesta({ token: 'tok-nuevo' }))
    montar()

    const [primera] = await screen.findAllByRole('button', { name: copy.invitar.renew })
    fireEvent.click(primera!)

    expect(await screen.findByLabelText(copy.invitar.linkLabel)).toHaveValue(
      `${window.location.origin}/unirse?invitacion=inv-2#token=tok-nuevo`,
    )
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/book/invitations/inv-2/link'),
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('quien no administra no ve las invitaciones', () => {
    montar(false)

    expect(screen.queryByRole('button', { name: copy.invitar.renew })).toBeNull()
  })
})
