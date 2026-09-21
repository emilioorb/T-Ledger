import { describe, expect, it } from 'vitest'
import { moneySchema } from './money.schema.js'

describe('moneySchema', () => {
  it('acepta un entero en unidades mínimas', () => {
    expect(moneySchema.safeParse({ minorUnits: '450000', currency: 'CRC' }).success).toBe(true)
  })

  it('un monto que no es número se rechaza, no revienta', () => {
    // Los checks de un mismo string corren todos para poder reportar todos los errores, así
    // que el refine del rango recibe el valor aunque el regex ya lo haya rechazado. Si ese
    // refine llama a BigInt sin cuidado, tira una excepción que nadie atrapa: el endpoint
    // responde 500 en vez de 400 y el valor del usuario termina dentro del mensaje del error,
    // que es por donde se escapó un monto a Sentry el 21/09/2026.
    const resultado = moneySchema.safeParse({ minorUnits: 'no-es-un-numero', currency: 'CRC' })

    expect(resultado.success).toBe(false)
  })

  it('el error no repite el valor que mandó el usuario', () => {
    const resultado = moneySchema.safeParse({ minorUnits: '450000x', currency: 'CRC' })

    expect(resultado.success).toBe(false)
    expect(JSON.stringify(resultado.error?.issues)).not.toContain('450000')
  })

  it('un monto con decimales tampoco pasa: acá se cuenta en unidades mínimas', () => {
    expect(moneySchema.safeParse({ minorUnits: '4500.50', currency: 'CRC' }).success).toBe(false)
  })

  it('sigue rechazando lo que supera el techo que el sistema puede sumar', () => {
    const enorme = '100000000000001'
    expect(moneySchema.safeParse({ minorUnits: enorme, currency: 'CRC' }).success).toBe(false)
  })

  it('el techo exacto entra', () => {
    expect(moneySchema.safeParse({ minorUnits: '100000000000000', currency: 'CRC' }).success).toBe(
      true,
    )
  })
})
