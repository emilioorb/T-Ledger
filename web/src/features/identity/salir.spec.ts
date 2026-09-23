import { QueryClient } from '@tanstack/react-query'
import { beforeEach, describe, expect, it } from 'vitest'
import { recuerdoDeSesion } from './recuerdo-de-sesion'
import { olvidarLaSesionLocal } from './salir'

describe('olvidarLaSesionLocal', () => {
  beforeEach(() => localStorage.clear())

  it('borra la marca de sesión: si no, la portada mandaría al tablero a quien acaba de salir', () => {
    recuerdoDeSesion.anotar()

    olvidarLaSesionLocal(new QueryClient())

    expect(recuerdoDeSesion.hubo()).toBe(false)
  })

  it('vacía la caché, que guarda las cifras de quien se fue', () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(['saldos'], 4_500_000)

    olvidarLaSesionLocal(queryClient)

    expect(queryClient.getQueryData(['saldos'])).toBeUndefined()
  })
})
