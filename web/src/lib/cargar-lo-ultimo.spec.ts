import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { cargarLoUltimo, useAlCargarLoUltimo } from './cargar-lo-ultimo'

const con = (client: QueryClient) => ({
  wrapper: ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children),
})

describe('cargar lo último', () => {
  it('recarga primero y recién después avisa a los formularios abiertos', async () => {
    const client = new QueryClient()
    const orden: string[] = []
    vi.spyOn(client, 'invalidateQueries').mockImplementation(async () => void orden.push('recargó'))
    renderHook(() => useAlCargarLoUltimo(() => orden.push('rearmó')), con(client))

    await cargarLoUltimo(client)

    expect(orden).toEqual(['recargó', 'rearmó'])
  })

  it('un formulario que ya se cerró no se entera', async () => {
    const client = new QueryClient()
    const rearmar = vi.fn()
    const { unmount } = renderHook(() => useAlCargarLoUltimo(rearmar), con(client))
    unmount()

    await cargarLoUltimo(client)

    expect(rearmar).not.toHaveBeenCalled()
  })
})
