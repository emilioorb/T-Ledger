import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { copy } from './copy'
import { Invitar } from './invitar'

vi.mock('@/features/identity/auth-client', () => ({
  organization: {
    inviteMember: vi.fn(async () => ({ data: { id: 'inv-9' }, error: null })),
    getFullOrganization: vi.fn(async () => ({ data: null, error: null })),
  },
}))

const respuesta = (cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), { status: 200, headers: { 'content-type': 'application/json' } })

afterEach(() => vi.restoreAllMocks())

describe('Invitar', () => {
  it('después de crear la invitación pide el enlace y lo muestra con el token en el fragmento', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(respuesta({ token: 'tok-libro' }))
    render(
      <QueryClientProvider client={new QueryClient()}>
        <Invitar />
      </QueryClientProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: copy.invitar.open }))
    fireEvent.change(screen.getByLabelText(copy.invitar.email), { target: { value: 'eva@correo.cr' } })
    fireEvent.click(screen.getByRole('button', { name: copy.invitar.submit }))

    const enlace = await screen.findByLabelText(copy.invitar.linkLabel)
    expect(enlace).toHaveValue(`${window.location.origin}/unirse?invitacion=inv-9#token=tok-libro`)
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/book/invitations/inv-9/link'),
      expect.objectContaining({ method: 'POST' }),
    )
  })
})
