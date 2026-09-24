import { describe, expect, it } from 'vitest'
import { esAdmin, leerAdmins } from './admin.js'

describe('quién administra la instancia', () => {
  it('lee una lista de ids separada por comas, con espacios de más', () => {
    expect(leerAdmins(' usr_uno , usr_dos ')).toEqual(['usr_uno', 'usr_dos'])
  })

  it('sin la variable no hay ningún administrador', () => {
    expect(leerAdmins(undefined)).toEqual([])
    expect(leerAdmins('')).toEqual([])
  })

  it('administra quien tiene un id de la lista, tal cual', () => {
    const admins = leerAdmins('usr_emilio')

    expect(esAdmin('usr_emilio', admins)).toBe(true)
    expect(esAdmin('USR_EMILIO', admins)).toBe(false)
  })

  it('nadie más administra, ni sin sesión', () => {
    const admins = leerAdmins('usr_emilio')

    expect(esAdmin('usr_otro', admins)).toBe(false)
    expect(esAdmin(undefined, admins)).toBe(false)
    expect(esAdmin('', [])).toBe(false)
  })

  it('un correo no alcanza: el correo no se verifica y cualquiera puede registrarlo', () => {
    expect(esAdmin('emilio@ejemplo.com', leerAdmins('usr_emilio'))).toBe(false)
  })
})
