import { describe, expect, it } from 'vitest'
import { describirAparato } from './aparato'

// El orden de las reglas es la lógica entera: Edge, Opera y Chrome se anuncian los tres como
// Chrome, y Safari aparece en la cadena de todos los navegadores de escritorio. Si alguien
// reordena la lista por prolijidad, todas las sesiones pasan a llamarse «Chrome en Mac» y
// nadie se entera, porque sigue leyéndose como un nombre razonable.
describe('describir el aparato de una sesión', () => {
  it('Edge no se llama Chrome, aunque diga que lo es', () => {
    const edge =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'

    expect(describirAparato(edge)).toBe('Edge en Windows')
  })

  it('Chrome en Mac, con Safari en la cadena', () => {
    const chrome =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

    expect(describirAparato(chrome)).toBe('Chrome en Mac')
  })

  it('Safari de verdad, que no dice Chrome', () => {
    const safari =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'

    expect(describirAparato(safari)).toBe('Safari en Mac')
  })

  it('un iPad en modo escritorio sigue siendo un iPad', () => {
    const ipad =
      'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'

    expect(describirAparato(ipad)).toBe('Safari en iPad')
  })

  it('Firefox en Linux', () => {
    expect(
      describirAparato('Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0'),
    ).toBe('Firefox en Linux')
  })

  it('lo que no se reconoce no se inventa', () => {
    expect(describirAparato('curl/8.4.0')).toBeNull()
    expect(describirAparato(null)).toBeNull()
    expect(describirAparato('')).toBeNull()
  })

  it('con solo uno de los dos, se dice ese', () => {
    expect(describirAparato('algo Windows algo')).toBe('Windows')
  })
})
