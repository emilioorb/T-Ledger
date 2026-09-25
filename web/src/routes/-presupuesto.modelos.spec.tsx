import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ComponentType } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { copy } from '@/features/budget/copy'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Route } from './presupuesto.modelos'

vi.mock('@tanstack/react-router', async (original) => ({
  ...(await original<typeof import('@tanstack/react-router')>()),
  createFileRoute: () => (opciones: { component: ComponentType }) => opciones,
}))

// jsdom no trae ResizeObserver. El Checkbox de Radix lo usa para medir su marca, y sin él
// ni siquiera monta.
class ResizeObserverFalso {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
window.ResizeObserver = ResizeObserverFalso as unknown as typeof ResizeObserver

const respuesta = (cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), { status: 200, headers: { 'content-type': 'application/json' } })

const modeloActivo = {
  id: 'm1',
  name: '50/30/20',
  active: true,
  version: 1,
  buckets: [
    { id: 'ahorro', name: 'Ahorro', percentage: '100', isSavings: true, accountCodes: [], colorIndex: null },
  ],
}

const montarCon = (fetchModelos: () => Promise<Response>) => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input)
    if (url.includes('/budget-models')) return fetchModelos()
    if (url.includes('/budget/income/')) return respuesta(null)
    if (url.includes('/accounts')) return respuesta({ data: [] })
    return respuesta([])
  })
  const Pantalla = (Route as unknown as { component: ComponentType }).component
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <TooltipProvider>
        <Pantalla />
      </TooltipProvider>
    </QueryClientProvider>,
  )
}

const montar = (modelos: unknown[]) => montarCon(async () => respuesta(modelos))

afterEach(() => vi.restoreAllMocks())

describe('el nuevo modelo nace activo si el libro no tiene ninguno', () => {
  it('con el libro sin modelos, «Activo» arranca marcado', async () => {
    montar([])

    const boton = await screen.findByRole('button', { name: copy.models.new })
    await waitFor(() => expect(boton).toBeEnabled())
    fireEvent.click(boton)

    expect(screen.getByRole('checkbox', { name: copy.models.form.activate })).toBeChecked()
  })

  it('con un modelo ya activo, el nuevo arranca sin marcar', async () => {
    montar([modeloActivo])

    const boton = await screen.findByRole('button', { name: copy.models.new })
    await waitFor(() => expect(boton).toBeEnabled())
    fireEvent.click(boton)

    expect(screen.getByRole('checkbox', { name: copy.models.form.activate })).not.toBeChecked()
  })

  // La lista todavía no dice si hay un modelo activo: el botón se queda deshabilitado, y un
  // clic mientras tanto no abre un formulario que podría nacer activo por error. Guardarlo así
  // apagaría en silencio el modelo que ya estaba activo (`apagarLosDemas`, en la api).
  it('con la lista todavía cargando, «Nuevo modelo» está deshabilitado y no abre el formulario', async () => {
    montarCon(() => new Promise<Response>(() => {}))

    const boton = await screen.findByRole('button', { name: copy.models.new })
    expect(boton).toBeDisabled()

    fireEvent.click(boton)

    expect(screen.queryByRole('checkbox', { name: copy.models.form.activate })).not.toBeInTheDocument()
  })
})
