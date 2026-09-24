import { describe, expect, it } from 'vitest'
import { esToken, generarToken, hashDelToken, puedeRegistrarse, type EnlaceDeInvitacion } from './registro.js'

const AHORA = new Date('2026-09-22T10:00:00Z')
const enUnaSemana = new Date('2026-09-29T10:00:00Z')
const laSemanaPasada = new Date('2026-09-15T10:00:00Z')

const enlace = (cambios: Partial<EnlaceDeInvitacion> = {}): EnlaceDeInvitacion => ({
  email: 'pareja@ejemplo.com',
  expiresAt: enUnaSemana,
  usedAt: null,
  invitacionVigente: true,
  ...cambios,
})

const pedido = (cambios: Partial<Parameters<typeof puedeRegistrarse>[0]> = {}) => ({
  esLaPrimeraCuenta: false,
  email: 'pareja@ejemplo.com',
  enlace: enlace(),
  ...cambios,
})

describe('puedeRegistrarse', () => {
  it('deja pasar a la primera cuenta de la instancia, sin enlace', () => {
    // No hay quien la invite: es quien acaba de levantar su T-Ledger.
    expect(puedeRegistrarse(pedido({ esLaPrimeraCuenta: true, enlace: null }), AHORA)).toBe(true)
  })

  it('deja pasar a quien trae el enlace de su invitación', () => {
    expect(puedeRegistrarse(pedido(), AHORA)).toBe(true)
  })

  it('no deja pasar sin enlace, aunque el correo esté invitado: saber el correo no alcanza', () => {
    expect(puedeRegistrarse(pedido({ enlace: null }), AHORA)).toBe(false)
  })

  it('no deja pasar con el enlace de otro correo', () => {
    expect(puedeRegistrarse(pedido({ email: 'intruso@ejemplo.com' }), AHORA)).toBe(false)
  })

  it('compara el correo sin distinguir mayúsculas ni espacios', () => {
    expect(puedeRegistrarse(pedido({ email: ' Pareja@Ejemplo.com ' }), AHORA)).toBe(true)
  })

  it('no deja pasar con un enlace vencido', () => {
    expect(puedeRegistrarse(pedido({ enlace: enlace({ expiresAt: laSemanaPasada }) }), AHORA)).toBe(false)
  })

  it('no deja pasar con un enlace que vence en este instante', () => {
    expect(puedeRegistrarse(pedido({ enlace: enlace({ expiresAt: AHORA }) }), AHORA)).toBe(false)
  })

  it('no deja pasar con un enlace ya usado', () => {
    expect(puedeRegistrarse(pedido({ enlace: enlace({ usedAt: laSemanaPasada }) }), AHORA)).toBe(false)
  })

  it('no deja pasar si la invitación del enlace se canceló o ya se aceptó', () => {
    expect(puedeRegistrarse(pedido({ enlace: enlace({ invitacionVigente: false }) }), AHORA)).toBe(false)
  })
})

describe('el token del enlace', () => {
  it('se genera distinto cada vez y con la forma que el registro reconoce', () => {
    const [uno, otro] = [generarToken(), generarToken()]

    expect(uno).not.toBe(otro)
    expect(esToken(uno)).toBe(true)
  })

  it('el registro solo reconoce texto con el largo y el alfabeto exactos', () => {
    // Un objeto como `{ not: '' }` usado como filtro de Prisma encontraría cualquier invitación
    // de ese correo: nunca tiene que llegar a la consulta.
    expect(esToken({ not: '' })).toBe(false)
    expect(esToken(['a'])).toBe(false)
    expect(esToken(42)).toBe(false)
    expect(esToken(undefined)).toBe(false)
    expect(esToken('corto')).toBe(false)
    expect(esToken(`${generarToken()}x`)).toBe(false)
    expect(esToken(generarToken().replace(/.$/, '='))).toBe(false)
  })

  it('en la base se guarda su hash, que no es el token y es siempre el mismo', () => {
    const token = generarToken()

    expect(hashDelToken(token)).not.toContain(token)
    expect(hashDelToken(token)).toBe(hashDelToken(token))
    expect(hashDelToken(token)).not.toBe(hashDelToken(generarToken()))
  })
})
