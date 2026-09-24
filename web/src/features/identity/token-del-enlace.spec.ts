import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { cabeceraDelToken, datosDelFragmento, useDatosDelEnlace } from './token-del-enlace'

const TOKEN = 'Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3'

afterEach(() => window.history.replaceState(null, '', '/'))

describe('datosDelFragmento', () => {
  it('saca el token y el correo del fragmento, aunque venga con otras cosas', () => {
    expect(datosDelFragmento(`#token=${TOKEN}`)).toEqual({ token: TOKEN })
    expect(datosDelFragmento(`#a=1&token=${TOKEN}&correo=ana%40correo.cr`)).toEqual({
      token: TOKEN,
      correo: 'ana@correo.cr',
    })
  })

  it('sin fragmento o con valores vacíos no hay nada', () => {
    expect(datosDelFragmento('')).toEqual({})
    expect(datosDelFragmento('#otra=cosa')).toEqual({})
    expect(datosDelFragmento('#token=&correo=')).toEqual({})
  })
})

describe('useDatosDelEnlace', () => {
  it('lee el fragmento y lo borra de la URL, sin tocar la búsqueda ni el estado del router', () => {
    window.history.replaceState({ key: 'del-router' }, '', '/unirse?invitacion=inv-1#token=abc_-123')

    const { result } = renderHook(() => useDatosDelEnlace())

    expect(result.current).toEqual({ token: 'abc_-123' })
    expect(window.location.hash).toBe('')
    expect(window.location.search).toBe('?invitacion=inv-1')
    expect(window.history.state).toEqual({ key: 'del-router' })
  })

  it('sin fragmento no hay nada', () => {
    window.history.replaceState(null, '', '/crear-cuenta')

    const { result } = renderHook(() => useDatosDelEnlace())

    expect(result.current).toEqual({})
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
