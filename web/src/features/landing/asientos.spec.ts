import { describe, expect, it } from 'vitest'
import { formatMoney } from '@/lib/money'
import { ASIENTOS, totalDe } from './asientos'

describe('los asientos de la landing', () => {
  it('cada uno cuadra por sí solo', () => {
    for (const asiento of ASIENTOS) {
      expect(asiento.debe.monto.minorUnits).toBe(asiento.haber.monto.minorUnits)
    }
  })

  it('los dos lados suman lo mismo, que es lo que la pantalla promete', () => {
    expect(totalDe(ASIENTOS, 'debe')).toEqual(totalDe(ASIENTOS, 'haber'))
  })

  it('el total es el que se lee al pie de la T', () => {
    // Con expresión regular y no con la cadena literal: `formatMoney` separa los miles con
    // U+202F, un espacio fino que no se distingue de uno normal al leerlo. Una prueba que
    // depende de un carácter invisible se rompe la primera vez que alguien la retipea.
    expect(formatMoney(totalDe(ASIENTOS, 'debe'))).toMatch(/^₡920\s000,00$/)
  })

  it('son tres: gastar, cobrar y abonar, que es lo que se hace todos los días', () => {
    expect(ASIENTOS).toHaveLength(3)
  })
})
