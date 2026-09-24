import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { cargarLoUltimo, loUltimoDe, useAlCargarLoUltimo } from './cargar-lo-ultimo'

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

describe('lo último de una entidad en la caché', () => {
  it('la encuentra en una lista, en una página o en el detalle, sin importar los filtros', () => {
    const cache = new QueryClient()
    cache.setQueryData(['metas', 'lista', '2026-09'], [{ id: 'a', version: 1 }])
    cache.setQueryData(['metas', 'pagina', 2], { data: [{ id: 'b', version: 2 }] })
    cache.setQueryData(['metas', 'detalle', 'c'], { id: 'c', version: 3 })

    expect(['a', 'b', 'c', 'x'].map((id) => loUltimoDe<{ id: string; version: number }>(cache, ['metas'], id)?.version)).toEqual([
      1,
      2,
      3,
      undefined,
    ])
  })

  it('no confunde la entidad con otra forma que comparte el campo: un nodo del árbol no es la cuenta', () => {
    const cache = new QueryClient()
    cache.setQueryData(['cuentas', 'arbol', 'CRC'], [{ code: '1', name: 'Activo', level: 0, children: [] }])
    cache.setQueryData(['cuentas', 'lista'], { data: [{ code: '1', name: 'Activo', version: 7 }] })

    expect(loUltimoDe<{ code: string; version: number }>(cache, ['cuentas'], '1', 'code')?.version).toBe(7)
  })
})

