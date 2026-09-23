import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Toaster } from '@/components/ui/sonner'
import { AvisoDeVersion } from './aviso-de-version'

const registro = vi.hoisted(() => ({
  hayVersionNueva: false,
  actualizar: vi.fn<(recargar?: boolean) => Promise<void>>(async () => {}),
}))

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [registro.hayVersionNueva, () => {}],
    offlineReady: [false, () => {}],
    updateServiceWorker: registro.actualizar,
  }),
}))

const conLaApp = () => (
  <>
    <AvisoDeVersion />
    <Toaster />
  </>
)

describe('AvisoDeVersion', () => {
  beforeEach(() => {
    registro.hayVersionNueva = false
    registro.actualizar.mockClear()
  })

  it('no dice nada mientras la versión instalada es la última', () => {
    render(conLaApp())

    expect(screen.queryByText('Hay una versión nueva')).not.toBeInTheDocument()
  })

  it('con la app abierta, cuando llega una versión nueva avisa una sola vez', async () => {
    const { rerender } = render(conLaApp())

    registro.hayVersionNueva = true
    rerender(conLaApp())
    rerender(conLaApp())

    expect(await screen.findAllByText('Hay una versión nueva')).toHaveLength(1)
  })

  it('actualiza solo cuando se lo piden', async () => {
    registro.hayVersionNueva = true
    render(conLaApp())

    await screen.findByText('Hay una versión nueva')
    expect(registro.actualizar).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }))

    expect(registro.actualizar).toHaveBeenCalledWith(true)
  })
})
