import { describe, expect, it } from 'vitest'
import {
  correoDeLaBusqueda,
  enlaceALaApp,
  enlaceAlLibro,
  tokenDelFragmento,
} from './enlace-de-invitacion'

const TOKEN = 'Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3'

describe('enlaceALaApp', () => {
  it('lleva a crear cuenta con el correo puesto y el token en el fragmento', () => {
    expect(enlaceALaApp('https://t-ledger.vercel.app', 'ana+libro@correo.cr', TOKEN)).toBe(
      `https://t-ledger.vercel.app/crear-cuenta?correo=ana%2Blibro%40correo.cr#token=${TOKEN}`,
    )
  })
})

describe('enlaceAlLibro', () => {
  it('lleva la invitación en la búsqueda y el token en el fragmento', () => {
    expect(enlaceAlLibro('https://t-ledger.vercel.app', 'inv 1', TOKEN)).toBe(
      `https://t-ledger.vercel.app/crear-cuenta?invitacion=inv%201#token=${TOKEN}`,
    )
  })
})

describe('tokenDelFragmento', () => {
  it('saca el token del fragmento', () => {
    expect(tokenDelFragmento(`#token=${TOKEN}`)).toBe(TOKEN)
  })

  it('sin fragmento o sin token no hay nada', () => {
    expect(tokenDelFragmento('')).toBeUndefined()
    expect(tokenDelFragmento('#otra=cosa')).toBeUndefined()
    expect(tokenDelFragmento('#token=')).toBeUndefined()
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
