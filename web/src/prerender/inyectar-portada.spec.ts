import { describe, expect, it } from 'vitest'
import { inyectarPortada } from './inyectar-portada'

const PLANTILLA = '<body>\n    <div id="root"></div>\n    <script type="module" src="/x.js"></script>\n  </body>'

describe('inyectarPortada', () => {
  it('escribe la portada adentro del #root, sin espacios que rompan la hidratación', () => {
    const html = inyectarPortada(PLANTILLA, '<main>Vos anotás</main>')

    expect(html).toContain('<div id="root"><main>Vos anotás</main></div>')
    expect(html).toContain('<script type="module" src="/x.js"></script>')
  })

  it('falla si la plantilla no tiene un #root vacío, en vez de publicar una portada sin prerender', () => {
    expect(() => inyectarPortada('<body></body>', '<main></main>')).toThrow(/#root/)
  })
})
