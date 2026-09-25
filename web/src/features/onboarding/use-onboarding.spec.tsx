import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useEmpezarBienvenida, useOnboardingStatus, usePasoDeBienvenida } from './use-onboarding'
import type { OnboardingStatus } from './types'

const respuesta = (cuerpo: unknown, status = 200) =>
  status === 204
    ? new Response(null, { status })
    : new Response(JSON.stringify(cuerpo), { status, headers: { 'content-type': 'application/json' } })

const con = (client: QueryClient) => ({
  wrapper: ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children),
})

afterEach(() => vi.restoreAllMocks())

describe('useOnboardingStatus', () => {
  it('pide /onboarding y devuelve el cuerpo tal cual', async () => {
    const cuerpo: OnboardingStatus = { pending: true, bookId: 'b1', steps: {} }
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(respuesta(cuerpo))
    const client = new QueryClient()

    const { result } = renderHook(() => useOnboardingStatus(), con(client))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(cuerpo)
    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/onboarding',
      expect.objectContaining({ headers: expect.objectContaining({ 'content-type': 'application/json' }) }),
    )
  })
})

describe('useEmpezarBienvenida', () => {
  it('manda el libro en que se abrió el modal', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(respuesta(null, 204))
    const client = new QueryClient()

    const { result } = renderHook(() => useEmpezarBienvenida(), con(client))
    result.current.mutate('b1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/onboarding/start',
      expect.objectContaining({ method: 'POST', headers: expect.objectContaining({ 'x-libro': 'b1' }) }),
    )
  })
})

describe('usePasoDeBienvenida', () => {
  it('manda el cuerpo y el libro al path del paso', async () => {
    const creado = { name: 'BAC Credomatic', currency: 'CRC', accountCode: '1.1.02', bankAccountId: 'ba-1' }
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(respuesta(creado, 201))
    const client = new QueryClient()

    const { result } = renderHook(() => usePasoDeBienvenida<{ name: string; currency: string }, typeof creado>('b1', 'banks'), con(client))
    const resultado = await result.current.mutateAsync({ name: 'BAC Credomatic', currency: 'CRC' })

    expect(resultado).toEqual(creado)
    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/onboarding/banks',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'BAC Credomatic', currency: 'CRC' }),
        headers: expect.objectContaining({ 'x-libro': 'b1' }),
      }),
    )
  })

  it('al terminar invalida lo que se creó pero no toca la consulta de la bienvenida', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(respuesta({ ok: true }, 201))
    const client = new QueryClient()
    client.setQueryData(['onboarding', 'status'], { pending: true, bookId: 'b1', steps: {} })
    client.setQueryData(['accounting', 'categories'], [])

    const { result } = renderHook(() => usePasoDeBienvenida<{ month: string }, { ok: boolean }>('b1', 'income'), con(client))
    await result.current.mutateAsync({ month: '2026-09' })

    await waitFor(() => expect(client.getQueryState(['accounting', 'categories'])?.isInvalidated).toBe(true))
    expect(client.getQueryState(['onboarding', 'status'])?.isInvalidated).not.toBe(true)
  })
})
