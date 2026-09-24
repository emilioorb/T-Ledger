import { describe, expect, it } from 'vitest'
import { enlaceALaApp, enlaceAlLibro } from './enlace-de-invitacion'

const TOKEN = 'Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3'

describe('enlaceALaApp', () => {
  it('lleva a crear cuenta con el token y el correo en el fragmento, que no llega a los logs', () => {
    expect(enlaceALaApp('https://t-ledger.vercel.app', 'ana+libro@correo.cr', TOKEN)).toBe(
      `https://t-ledger.vercel.app/crear-cuenta#token=${TOKEN}&correo=ana%2Blibro%40correo.cr`,
    )
  })
})

describe('enlaceAlLibro', () => {
  it('lleva la invitación en la búsqueda y el token en el fragmento', () => {
    expect(enlaceAlLibro('https://t-ledger.vercel.app', 'inv 1', TOKEN)).toBe(
      `https://t-ledger.vercel.app/unirse?invitacion=inv%201#token=${TOKEN}`,
    )
  })
})
