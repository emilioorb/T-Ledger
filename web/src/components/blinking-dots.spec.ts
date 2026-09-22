import { describe, expect, it } from 'vitest'
import { fieldFragment } from './blinking-dots'

describe('el shader del campo de puntos', () => {
  // Sin esto el papel oscuro sale casi negro y no coincide con el fondo de la página, que se
  // ve gris durante los cuadros en que el lienzo todavía no pintó.
  it('devuelve el color a sRGB antes de pintar', () => {
    expect(fieldFragment).toContain('#include <colorspace_fragment>')
  })
})
