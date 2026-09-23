import { describe, expect, it } from 'vitest'
import { correoDeLaBusqueda, enlaceDeInvitacion } from './enlace-de-invitacion'

describe('enlaceDeInvitacion', () => {
  it('lleva a crear cuenta con el correo ya puesto', () => {
    expect(enlaceDeInvitacion('https://t-ledger.vercel.app', 'ana+libro@correo.cr')).toBe(
      'https://t-ledger.vercel.app/crear-cuenta?correo=ana%2Blibro%40correo.cr',
    )
  })
})

describe('correoDeLaBusqueda', () => {
  it('toma el correo del enlace', () => {
    expect(correoDeLaBusqueda({ correo: 'ana@correo.cr' })).toBe('ana@correo.cr')
  })

  it('ignora lo que no es texto', () => {
    expect(correoDeLaBusqueda({ correo: 42 })).toBeUndefined()
    expect(correoDeLaBusqueda({})).toBeUndefined()
  })
})
