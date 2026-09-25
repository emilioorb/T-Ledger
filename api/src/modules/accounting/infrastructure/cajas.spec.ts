import { describe, expect, it } from 'vitest'
import { CAJAS } from './cajas.js'
import { CHART_SEED } from './chart-seed.js'

describe('CAJAS', () => {
  it('nombra cuentas que la semilla crea y que aceptan asientos', () => {
    const madres = new Set(CHART_SEED.map((cuenta) => cuenta.parentCode))
    for (const codigo of Object.keys(CAJAS)) {
      const semilla = CHART_SEED.find((cuenta) => cuenta.code === codigo)
      expect(semilla, `falta ${codigo} en la semilla`).toBeDefined()
      expect(madres.has(codigo), `${codigo} es agrupadora`).toBe(false)
    }
  })
})
