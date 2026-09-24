import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { copy } from './copy'
import { Unirse } from './unirse'

const navegar = vi.fn()
const sesion = vi.hoisted(() => ({ actual: null as { user: { email: string } } | null }))
const aceptar = vi.hoisted(() => vi.fn())
const activar = vi.hoisted(() => vi.fn(async () => ({ data: null, error: null })))

vi.mock('@tanstack/react-router', async (original) => ({
  ...(await original<typeof import('@tanstack/react-router')>()),
  useNavigate: () => navegar,
  useSearch: () => ({ invitacion: 'inv-1' }),
  Link: ({ children, search }: { children: React.ReactNode; search?: { redirigirA?: string } }) => (
    <a href={`/entrar?redirigirA=${search?.redirigirA ?? ''}`}>{children}</a>
  ),
}))

vi.mock('@/router', () => ({ queryClient: { clear: vi.fn() } }))

vi.mock('./auth-client', () => ({
  useSession: () => ({ data: sesion.actual, isPending: false }),
  organization: { acceptInvitation: aceptar, setActive: activar },
}))

// jsdom no trae matchMedia; con «prefiere quietud» el marco no anima nada.
window.matchMedia = (consulta: string) =>
  ({ matches: consulta.includes('reduce'), media: consulta, addEventListener: () => {}, removeEventListener: () => {} }) as unknown as MediaQueryList

const TOKEN = 'Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3'

beforeEach(() => {
  sessionStorage.clear()
  window.history.replaceState(null, '', `/unirse?invitacion=inv-1#token=${TOKEN}`)
})

afterEach(() => {
  vi.clearAllMocks()
  window.history.replaceState(null, '', '/')
})

describe('unirse a un libro', { timeout: 15_000 }, () => {
  it('con sesión, acepta con el token del enlace y entra al libro', async () => {
    sesion.actual = { user: { email: 'eva@correo.cr' } }
    aceptar.mockResolvedValue({ data: { invitation: { organizationId: 'lib-1' } }, error: null })
    render(<Unirse />)

    fireEvent.click(await screen.findByRole('button', { name: copy.unirse.join }))

    await waitFor(() => expect(navegar).toHaveBeenCalledWith({ to: '/tablero' }))
    expect(aceptar).toHaveBeenCalledWith(
      { invitationId: 'inv-1' },
      { headers: { 'x-token-invitacion': TOKEN } },
    )
    expect(activar).toHaveBeenCalledWith({ organizationId: 'lib-1' })
    expect(window.location.hash).toBe('')
  })

  it('si el servidor la rechaza, lo dice y no entra', async () => {
    sesion.actual = { user: { email: 'eva@correo.cr' } }
    aceptar.mockResolvedValue({ data: null, error: { status: 403 } })
    render(<Unirse />)

    fireEvent.click(await screen.findByRole('button', { name: copy.unirse.join }))

    expect(await screen.findByRole('alert')).toHaveTextContent(copy.unirse.unavailable)
    expect(navegar).not.toHaveBeenCalled()
  })

  it('sin sesión manda a entrar sin el token en la URL, y lo recuerda al volver', async () => {
    sesion.actual = null
    const { unmount } = render(<Unirse />)

    const entrar = await screen.findByRole('link', { name: copy.unirse.signIn })
    expect(entrar.getAttribute('href')).toBe('/entrar?redirigirA=/unirse?invitacion=inv-1')
    expect(entrar.getAttribute('href')).not.toContain(TOKEN)
    unmount()

    // Vuelve de entrar sin el fragmento: el token sale de la pestaña.
    window.history.replaceState(null, '', '/unirse?invitacion=inv-1')
    sesion.actual = { user: { email: 'eva@correo.cr' } }
    aceptar.mockResolvedValue({ data: { invitation: { organizationId: 'lib-1' } }, error: null })
    render(<Unirse />)
    fireEvent.click(await screen.findByRole('button', { name: copy.unirse.join }))

    await waitFor(() =>
      expect(aceptar).toHaveBeenCalledWith({ invitationId: 'inv-1' }, { headers: { 'x-token-invitacion': TOKEN } }),
    )
  })

  it('sin token no ofrece unirse', async () => {
    window.history.replaceState(null, '', '/unirse?invitacion=inv-1')
    sesion.actual = { user: { email: 'eva@correo.cr' } }
    render(<Unirse />)

    expect(await screen.findByText(copy.unirse.incomplete)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: copy.unirse.join })).toBeNull()
  })
})
