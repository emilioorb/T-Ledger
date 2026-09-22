import { describe, expect, it } from 'vitest'
import { finDe, marcaEn, TIRADA, type Paso } from './sumadora'

const PASOS: Paso[] = [
  { en: 100, hasta: 20_000 },
  { en: 300, hasta: 870_000 },
  { en: 500, hasta: 920_000 },
]

describe('la sumadora', () => {
  it('arranca en cero', () => {
    expect(marcaEn(0, PASOS)).toBe(0)
    expect(marcaEn(99, PASOS)).toBe(0)
  })

  it('cada tirada termina exactamente en su acumulado', () => {
    expect(marcaEn(100 + TIRADA, [PASOS[0]!])).toBe(20_000)
  })

  it('nunca pasa del total ni vuelve atrás', () => {
    let anterior = 0
    for (let ms = 0; ms <= finDe(PASOS); ms += 7) {
      const marca = marcaEn(ms, PASOS)
      expect(marca).toBeGreaterThanOrEqual(anterior)
      expect(marca).toBeLessThanOrEqual(920_000)
      anterior = marca
    }
  })

  it('al terminar marca el total', () => {
    expect(marcaEn(finDe(PASOS), PASOS)).toBe(920_000)
  })
})
