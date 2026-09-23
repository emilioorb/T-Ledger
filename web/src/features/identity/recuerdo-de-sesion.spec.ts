import { beforeEach, describe, expect, it } from 'vitest'
import { recuerdoDeSesion } from './recuerdo-de-sesion'

describe('recuerdoDeSesion', () => {
  beforeEach(() => localStorage.clear())

  it('no recuerda nada en un navegador que nunca entró', () => {
    expect(recuerdoDeSesion.hubo()).toBe(false)
  })

  it('recuerda que hubo sesión hasta que se olvida', () => {
    recuerdoDeSesion.anotar()
    expect(recuerdoDeSesion.hubo()).toBe(true)

    recuerdoDeSesion.olvidar()
    expect(recuerdoDeSesion.hubo()).toBe(false)
  })

  // Modo privado o almacenamiento bloqueado: el acceso tira. Recordar es una comodidad, así
  // que sin almacenamiento se comporta como un navegador que nunca entró.
  it('sin almacenamiento no rompe y no recuerda', () => {
    const original = Storage.prototype.getItem
    Storage.prototype.getItem = () => {
      throw new Error('bloqueado')
    }
    try {
      expect(recuerdoDeSesion.hubo()).toBe(false)
    } finally {
      Storage.prototype.getItem = original
    }
  })
})
