import { describe, expect, it } from 'vitest'
import { montosAPorcentajes, sumaDePorcentajes } from './montos-a-porcentajes'

// Montos en céntimos, como viajan.
const colones = (monto: number) => BigInt(monto * 100)

describe('montosAPorcentajes', () => {
  it('convierte cada monto en su parte del ingreso', () => {
    expect(montosAPorcentajes([colones(500_000), colones(300_000), colones(200_000)], colones(1_000_000))).toEqual([
      '50',
      '30',
      '20',
    ])
  })

  it('con decimales, hasta dos', () => {
    expect(montosAPorcentajes([colones(123_450)], colones(1_000_000))).toEqual(['12.35'])
    expect(montosAPorcentajes([colones(125_000)], colones(1_000_000))).toEqual(['12.5'])
  })

  it('tres tercios suman 100 justo: el redondeo se reparte', () => {
    const porcentajes = montosAPorcentajes([colones(100_000), colones(100_000), colones(100_000)], colones(300_000))

    expect(porcentajes).toEqual(['33.34', '33.33', '33.33'])
    expect(sumaDePorcentajes(porcentajes)).toBe(100)
  })

  it('si los montos no llegan al ingreso, no inventa lo que falta', () => {
    const porcentajes = montosAPorcentajes([colones(400_000), colones(300_000)], colones(1_000_000))

    expect(porcentajes).toEqual(['40', '30'])
    expect(sumaDePorcentajes(porcentajes)).toBe(70)
  })

  it('sin ingreso no hay contra qué convertir', () => {
    expect(montosAPorcentajes([colones(1_000)], 0n)).toEqual(['0'])
  })
})

describe('sumaDePorcentajes', () => {
  it('suma sin el error de la coma flotante', () => {
    expect(sumaDePorcentajes(['33.33', '33.33', '33.34'])).toBe(100)
    expect(sumaDePorcentajes(['0.1', '0.2', '99.7'])).toBe(100)
  })

  it('lo que no es número cuenta como cero', () => {
    expect(sumaDePorcentajes(['', 'abc', '50'])).toBe(50)
  })
})
