import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { copy } from './copy'
import { Unirse } from './unirse'

const navegar = vi.fn()
const sesion = vi.hoisted(() => ({ actual: null as { user: { email: string } } | null }))
const aceptar = vi.hoisted(() => vi.fn())
const activar = vi.hoisted(() => vi.fn())
const detalle = vi.hoisted(() => vi.fn())

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
  signOut: vi.fn(async () => ({})),
  organization: { acceptInvitation: aceptar, setActive: activar, getInvitation: detalle },
}))

// jsdom no trae matchMedia; con «prefiere quietud» el marco no anima nada.
window.matchMedia = (consulta: string) =>
  ({ matches: consulta.includes('reduce'), media: consulta, addEventListener: () => {}, removeEventListener: () => {} }) as unknown as MediaQueryList

const TOKEN = 'Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3'
const INVITACION = { inviterEmail: 'ana@correo.cr', organizationName: 'Casa', role: 'editor' }

const montar = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <Unirse />
    </QueryClientProvider>,
  )

const guardado = () => sessionStorage.getItem('token-invitacion:inv-1')

beforeEach(() => {
  sessionStorage.clear()
  window.history.replaceState(null, '', `/unirse?invitacion=inv-1#token=${TOKEN}`)
  sesion.actual = { user: { email: 'eva@correo.cr' } }
  detalle.mockResolvedValue({ data: INVITACION, error: null })
  activar.mockResolvedValue({ data: {}, error: null })
})

afterEach(() => {
  vi.clearAllMocks()
  window.history.replaceState(null, '', '/')
})

describe('unirse a un libro', { timeout: 15_000 }, () => {
  it('dice a qué libro entra y quién invita, y acepta con el token del enlace', async () => {
    aceptar.mockResolvedValue({ data: { invitation: { organizationId: 'lib-1' } }, error: null })
    montar()

    expect(await screen.findByText(copy.unirse.invitedBy('ana@correo.cr', 'Casa', 'todo el libro, menos la gente'))).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: copy.unirse.join }))

    await waitFor(() => expect(navegar).toHaveBeenCalledWith({ to: '/tablero' }))
    expect(aceptar).toHaveBeenCalledWith({ invitationId: 'inv-1' }, { headers: { 'x-token-invitacion': TOKEN } })
    expect(activar).toHaveBeenCalledWith({ organizationId: 'lib-1' })
    expect(window.location.hash).toBe('')
    expect(guardado()).toBeNull()
  })

  it('si el servidor la rechaza, lo dice, no entra y olvida el token', async () => {
    aceptar.mockResolvedValue({ data: null, error: { status: 403 } })
    montar()

    fireEvent.click(await screen.findByRole('button', { name: copy.unirse.join }))

    expect(await screen.findByRole('alert')).toHaveTextContent(copy.unirse.unavailable)
    expect(navegar).not.toHaveBeenCalled()
    expect(guardado()).toBeNull()
  })

  it('sin conexión no culpa a la invitación y conserva el token para reintentar', async () => {
    aceptar.mockResolvedValue({ data: null, error: { status: 0 } })
    montar()

    fireEvent.click(await screen.findByRole('button', { name: copy.unirse.join }))

    expect(await screen.findByRole('alert')).toHaveTextContent(copy.entrar.unreachable)
    expect(guardado()).toBe(TOKEN)
  })

  it('si entró pero el libro no se pudo abrir, lo dice en vez de llevarla al libro anterior', async () => {
    aceptar.mockResolvedValue({ data: { invitation: { organizationId: 'lib-1' } }, error: null })
    activar.mockResolvedValue({ data: null, error: { status: 500 } })
    montar()

    fireEvent.click(await screen.findByRole('button', { name: copy.unirse.join }))

    expect(await screen.findByRole('alert')).toHaveTextContent(copy.unirse.joinedNotOpened)
    expect(navegar).not.toHaveBeenCalled()
  })

  it('con la sesión de otro correo, lo dice y ofrece entrar con otra cuenta', async () => {
    detalle.mockResolvedValue({ data: null, error: { status: 403 } })
    montar()

    expect(await screen.findByText(copy.unirse.otherAccount('eva@correo.cr'))).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: copy.unirse.switchAccount }))

    await waitFor(() =>
      expect(navegar).toHaveBeenCalledWith({ to: '/entrar', search: { redirigirA: '/unirse?invitacion=inv-1' } }),
    )
    expect(guardado()).toBe(TOKEN)
  })

  it('sin sesión manda a entrar sin el token en la URL, y lo recuerda al volver', async () => {
    sesion.actual = null
    const { unmount } = montar()

    const entrar = await screen.findByRole('link', { name: copy.unirse.signIn })
    expect(entrar.getAttribute('href')).toBe('/entrar?redirigirA=/unirse?invitacion=inv-1')
    expect(entrar.getAttribute('href')).not.toContain(TOKEN)
    unmount()

    window.history.replaceState(null, '', '/unirse?invitacion=inv-1')
    sesion.actual = { user: { email: 'eva@correo.cr' } }
    aceptar.mockResolvedValue({ data: { invitation: { organizationId: 'lib-1' } }, error: null })
    montar()
    fireEvent.click(await screen.findByRole('button', { name: copy.unirse.join }))

    await waitFor(() =>
      expect(aceptar).toHaveBeenCalledWith({ invitationId: 'inv-1' }, { headers: { 'x-token-invitacion': TOKEN } }),
    )
  })

  it('el token guardado de otra invitación no sirve para esta', async () => {
    sessionStorage.setItem('token-invitacion:inv-2', TOKEN)
    window.history.replaceState(null, '', '/unirse?invitacion=inv-1')
    montar()

    expect(await screen.findByText(copy.unirse.incomplete)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: copy.unirse.join })).toBeNull()
  })
})
