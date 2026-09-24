import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ComponentType } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { copy } from '@/features/identity/copy'
import { Route } from './crear-cuenta'

const navegar = vi.fn()

vi.mock('@tanstack/react-router', async (original) => ({
  ...(await original<typeof import('@tanstack/react-router')>()),
  createFileRoute: () => (opciones: { component: ComponentType }) => opciones,
  useNavigate: () => navegar,
  Link: ({ children }: { children: React.ReactNode }) => <a href="/entrar">{children}</a>,
}))

vi.mock('@/router', () => ({ queryClient: { clear: vi.fn() } }))

// jsdom no trae matchMedia. El marco de identidad pregunta si la persona prefiere quietud, y
// con un sí no anima nada, que jsdom tampoco sabe hacer.
window.matchMedia = (consulta: string) =>
  ({ matches: consulta.includes('reduce'), media: consulta, addEventListener: () => {}, removeEventListener: () => {} }) as unknown as MediaQueryList

const TOKEN = 'Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3'

const json = (cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), { status: 200, headers: { 'content-type': 'application/json' } })

const cabeceraDe = (init: RequestInit | undefined) => new Headers(init?.headers).get('x-token-invitacion')

afterEach(() => {
  vi.restoreAllMocks()
  window.history.replaceState(null, '', '/')
})

// La pantalla trae el marco de identidad entero; con la suite en paralelo no alcanzan los 5 s.
describe('crear cuenta con el enlace de acceso', { timeout: 15_000 }, () => {
  it('manda el token del fragmento al registrarse y lo borra de la URL', async () => {
    window.history.replaceState(null, '', `/crear-cuenta#token=${TOKEN}&correo=eva%40correo.cr`)
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(json({ token: 'sesion', user: { id: 'usr-1', email: 'eva@correo.cr', name: 'Eva' } }))
    const Pantalla = (Route as unknown as { component: ComponentType }).component
    render(<Pantalla />)

    fireEvent.change(await screen.findByLabelText(copy.crear.name), { target: { value: 'Eva' } })
    expect(window.location.hash).toBe('')
    fireEvent.change(screen.getByLabelText(copy.entrar.password), { target: { value: 'una-clave-larga' } })
    fireEvent.click(screen.getByRole('button', { name: copy.crear.submit }))

    await waitFor(() => expect(navegar).toHaveBeenCalledWith({ to: '/tablero' }))
    const registro = fetch.mock.calls.find(([url]) => String(url).includes('sign-up'))
    expect(cabeceraDe(registro?.[1])).toBe(TOKEN)
  })

  it('con el enlace deja el correo puesto y dice que le dieron acceso', async () => {
    window.history.replaceState(null, '', `/crear-cuenta#token=${TOKEN}&correo=eva%40correo.cr`)
    const Pantalla = (Route as unknown as { component: ComponentType }).component
    render(<Pantalla />)

    expect(await screen.findByText(copy.crear.invited)).toBeInTheDocument()
    expect(screen.getByLabelText(copy.entrar.email)).toHaveValue('eva@correo.cr')
  })

  it('sin enlace es la primera cuenta, y un 403 dice que el enlace no sirve', async () => {
    window.history.replaceState(null, '', '/crear-cuenta')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'no' }), { status: 403, headers: { 'content-type': 'application/json' } }),
    )
    const Pantalla = (Route as unknown as { component: ComponentType }).component
    render(<Pantalla />)

    expect(await screen.findByText(copy.crear.alone)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(copy.crear.name), { target: { value: 'Eva' } })
    fireEvent.change(screen.getByLabelText(copy.entrar.email), { target: { value: 'eva@correo.cr' } })
    fireEvent.change(screen.getByLabelText(copy.entrar.password), { target: { value: 'una-clave-larga' } })
    fireEvent.click(screen.getByRole('button', { name: copy.crear.submit }))

    expect(await screen.findByRole('alert')).toHaveTextContent(copy.crear.notInvited)
  })
})
