import { describe, expect, it } from 'vitest'
import { llevaFondo } from './lleva-fondo'

const conPuntero = (tactil: boolean) => (consulta: string) => ({ matches: tactil && consulta === '(pointer: coarse)' })

describe('llevaFondo', () => {
  it('con mouse, la portada lleva su campo de puntos', () => {
    expect(llevaFondo(conPuntero(false))).toBe(true)
  })

  it('en una pantalla táctil no: three.js se llevaba más de un tercio del tiempo trabado de la carga', () => {
    expect(llevaFondo(conPuntero(true))).toBe(false)
  })
})
