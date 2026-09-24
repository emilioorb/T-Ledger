import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ComponentType } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { copy } from '@/features/identity/copy'
import { Route } from './crear-cuenta'

const navegar = vi.fn()

vi.mock('@tanstack/react-router', async (original) => ({
  ...(await original<typeof import('@tanstack/react-router')>()),
  createFileRoute: () => (opciones: { component: ComponentType }) => ({
    ...opciones,
    useSearch: () => ({ invitacion: 'inv-1', correo: 'eva@correo.cr' }),
  }),
  useNavigate: () => navegar,
  Link: ({ children }: { children: React.ReactNode }) => <a href="/entrar">{children}</a>,
}))

vi.mock('@/router', () => ({ queryClient: { clear: vi.fn() } }))

const TOKEN = 'Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3'

const json = (cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), { status: 200, headers: { 'content-type': 'application/json' } })

const cabeceraDe = (init: RequestInit | undefined) => new Headers(init?.headers).get('x-token-invitacion')

// jsdom no trae matchMedia. El marco de identidad pregunta si la persona prefiere quietud, y
// con un sí no anima nada, que jsdom tampoco sabe hacer.
window.matchMedia = (consulta: string) =>
  ({ matches: consulta.includes('reduce'), media: consulta, addEventListener: () => {}, removeEventListener: () => {} }) as unknown as MediaQueryList

afterEach(() => {
  vi.restoreAllMocks()
  window.history.replaceState(null, '', '/')
})

// La pantalla trae el marco de identidad entero; con la suite en paralelo no alcanzan los 5 s.
describe('crear cuenta con el enlace de una invitación', { timeout: 15_000 }, () => {
  it('manda el token del fragmento al registrarse y al aceptar, y lo borra de la URL', async () => {
    window.history.replaceState(null, '', `/crear-cuenta?invitacion=inv-1#token=${TOKEN}`)
    const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) =>
      String(url).includes('sign-up')
        ? json({ token: 'sesion', user: { id: 'usr-1', email: 'eva@correo.cr', name: 'Eva' } })
        : json({ invitation: { id: 'inv-1' }, member: { id: 'm-1' } }),
    )
    const Pantalla = (Route as unknown as { component: ComponentType }).component
    render(<Pantalla />)

    fireEvent.change(await screen.findByLabelText(copy.crear.name), { target: { value: 'Eva' } })
    expect(window.location.hash).toBe('')
    fireEvent.change(screen.getByLabelText(copy.entrar.password), { target: { value: 'una-clave-larga' } })
    fireEvent.click(screen.getByRole('button', { name: copy.crear.submit }))

    await waitFor(() => expect(navegar).toHaveBeenCalledWith({ to: '/tablero' }))
    const registro = fetch.mock.calls.find(([url]) => String(url).includes('sign-up'))
    const aceptar = fetch.mock.calls.find(([url]) => String(url).includes('accept-invitation'))
    expect(cabeceraDe(registro?.[1])).toBe(TOKEN)
    expect(cabeceraDe(aceptar?.[1])).toBe(TOKEN)
  })
})
