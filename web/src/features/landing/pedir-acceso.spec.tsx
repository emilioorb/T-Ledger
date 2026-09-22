import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { copy } from './copy'
import { PedirAcceso } from './pedir-acceso'

const escribir = vi.fn<(texto: string) => Promise<void>>()

beforeEach(() => {
  escribir.mockReset()
  escribir.mockResolvedValue(undefined)
  // `defineProperty` y no `Object.assign`: en jsdom `navigator.clipboard` es de solo lectura
  // y asignarla tira «Cannot redefine property».
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: escribir },
    configurable: true,
  })
})

// Con `fireEvent` y no con `userEvent`: `@testing-library/user-event` no está instalado en
// este repositorio y la landing no justifica sumar una dependencia. Para tres clics sobre
// botones, `fireEvent` alcanza.
const abrir = () => {
  render(<PedirAcceso />)
  fireEvent.click(screen.getByRole('button', { name: copy.acceso.open }))
}

describe('PedirAcceso', () => {
  it('abre el modal con la dirección a la vista', async () => {
    abrir()
    expect(await screen.findByText(copy.acceso.email)).toBeInTheDocument()
  })

  it('copia la dirección al portapapeles', async () => {
    abrir()
    fireEvent.click(await screen.findByRole('button', { name: copy.acceso.copy }))
    expect(escribir).toHaveBeenCalledWith(copy.acceso.email)
  })

  it('el enlace de escribir lleva el asunto puesto', async () => {
    abrir()
    const enlace = await screen.findByRole('link', { name: copy.acceso.write })
    expect(enlace.getAttribute('href')).toContain('mailto:')
    expect(enlace.getAttribute('href')).toContain(encodeURIComponent(copy.acceso.subject))
  })
})
