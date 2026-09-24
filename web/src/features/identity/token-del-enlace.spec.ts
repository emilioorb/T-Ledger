import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { cabeceraDelToken, useTokenDelEnlace } from './token-del-enlace'

afterEach(() => window.history.replaceState(null, '', '/'))

describe('useTokenDelEnlace', () => {
  it('lee el token del fragmento y lo borra de la URL, sin tocar la búsqueda', () => {
    window.history.replaceState(null, '', '/crear-cuenta?invitacion=inv-1#token=abc_-123')

    const { result } = renderHook(() => useTokenDelEnlace())

    expect(result.current).toBe('abc_-123')
    expect(window.location.hash).toBe('')
    expect(window.location.search).toBe('?invitacion=inv-1')
  })

  it('sin fragmento no hay token', () => {
    window.history.replaceState(null, '', '/crear-cuenta')

    const { result } = renderHook(() => useTokenDelEnlace())

    expect(result.current).toBeUndefined()
  })
})

describe('cabeceraDelToken', () => {
  it('manda el token en la cabecera que lee el servidor', () => {
    expect(cabeceraDelToken('abc')).toEqual({ 'x-token-invitacion': 'abc' })
  })

  it('sin token no manda cabecera', () => {
    expect(cabeceraDelToken(undefined)).toEqual({})
  })
})
