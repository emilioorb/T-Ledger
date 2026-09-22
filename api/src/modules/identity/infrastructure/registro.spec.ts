import { describe, expect, it } from 'vitest'
import { puedeRegistrarse } from './registro.js'

const AHORA = new Date('2026-09-22T10:00:00Z')
const enUnaSemana = new Date('2026-09-29T10:00:00Z')
const laSemanaPasada = new Date('2026-09-15T10:00:00Z')

describe('puedeRegistrarse', () => {
  it('deja pasar a la primera cuenta de la instancia', () => {
    // No hay quien la invite: es quien acaba de levantar su T-Ledger.
    expect(puedeRegistrarse({ esLaPrimeraCuenta: true, invitaciones: [] }, AHORA)).toBe(true)
  })

  it('deja pasar a quien tiene una invitación vigente', () => {
    const invitaciones = [{ status: 'pending', expiresAt: enUnaSemana }]

    expect(puedeRegistrarse({ esLaPrimeraCuenta: false, invitaciones }, AHORA)).toBe(true)
  })

  it('no deja pasar a quien no fue invitado', () => {
    expect(puedeRegistrarse({ esLaPrimeraCuenta: false, invitaciones: [] }, AHORA)).toBe(false)
  })

  it('no deja pasar con una invitación vencida', () => {
    const invitaciones = [{ status: 'pending', expiresAt: laSemanaPasada }]

    expect(puedeRegistrarse({ esLaPrimeraCuenta: false, invitaciones }, AHORA)).toBe(false)
  })

  it('no deja pasar con una invitación que ya se usó', () => {
    // El estado lo pone Better Auth al aceptarla. Sin esta condición, la misma invitación
    // serviría para crear cuentas para siempre.
    const invitaciones = [{ status: 'accepted', expiresAt: enUnaSemana }]

    expect(puedeRegistrarse({ esLaPrimeraCuenta: false, invitaciones }, AHORA)).toBe(false)
  })

  it('no deja pasar con una invitación cancelada', () => {
    const invitaciones = [{ status: 'canceled', expiresAt: enUnaSemana }]

    expect(puedeRegistrarse({ esLaPrimeraCuenta: false, invitaciones }, AHORA)).toBe(false)
  })

  it('alcanza con que una de varias sirva', () => {
    // A un mismo correo lo pueden invitar dos libros distintos, y que el primero haya vencido
    // no tiene nada que ver con el segundo.
    const invitaciones = [
      { status: 'pending', expiresAt: laSemanaPasada },
      { status: 'accepted', expiresAt: enUnaSemana },
      { status: 'pending', expiresAt: enUnaSemana },
    ]

    expect(puedeRegistrarse({ esLaPrimeraCuenta: false, invitaciones }, AHORA)).toBe(true)
  })

  it('la que vence en este instante ya no sirve', () => {
    const invitaciones = [{ status: 'pending', expiresAt: AHORA }]

    expect(puedeRegistrarse({ esLaPrimeraCuenta: false, invitaciones }, AHORA)).toBe(false)
  })
})
