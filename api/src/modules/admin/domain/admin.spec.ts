import { describe, expect, it } from 'vitest'
import { esAdmin, leerAdmins } from './admin.js'

describe('quién administra la instancia', () => {
  it('lee una lista separada por comas, con espacios de más', () => {
    expect(leerAdmins(' uno@ejemplo.com , dos@ejemplo.com ')).toEqual([
      'uno@ejemplo.com',
      'dos@ejemplo.com',
    ])
  })

  it('sin la variable no hay ningún administrador', () => {
    // Una instancia recién levantada no tiene superusuarios hasta que alguien lo diga.
    expect(leerAdmins(undefined)).toEqual([])
    expect(leerAdmins('')).toEqual([])
  })

  it('el correo se compara sin distinguir mayúsculas', () => {
    const admins = leerAdmins('Emilio@Ejemplo.com')

    expect(esAdmin('emilio@ejemplo.com', admins)).toBe(true)
    expect(esAdmin('EMILIO@EJEMPLO.COM', admins)).toBe(true)
  })

  it('quien no está en la lista no lo es', () => {
    const admins = leerAdmins('emilio@ejemplo.com')

    expect(esAdmin('otro@ejemplo.com', admins)).toBe(false)
    expect(esAdmin(undefined, admins)).toBe(false)
  })

  it('sin lista, nadie lo es: ni siquiera con el correo vacío', () => {
    expect(esAdmin('', [])).toBe(false)
    expect(esAdmin('cualquiera@ejemplo.com', [])).toBe(false)
  })
})
