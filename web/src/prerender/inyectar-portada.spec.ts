import { describe, expect, it } from 'vitest'
import { inyectarPortada } from './inyectar-portada'

const PLANTILLA = '<body>\n    <div id="root"></div>\n    <script type="module" src="/x.js"></script>\n  </body>'

describe('inyectarPortada', () => {
  it('escribe la portada adentro del #root, sin espacios que rompan la hidratación', () => {
    const html = inyectarPortada(PLANTILLA, '<main>Vos anotás</main>')

    expect(html).toContain('<div id="root"><main>Vos anotás</main></div>')
    expect(html).toContain('<script type="module" src="/x.js"></script>')
  })

  it('escribe la portada literal aunque traiga patrones de reemplazo como $& o $`', () => {
    const portada = "<p>US$&nbsp;5 $& $'</p>"

    expect(inyectarPortada(PLANTILLA, portada)).toContain(`<div id="root">${portada}</div>`)
  })

  it('falla si la plantilla no tiene un #root vacío, en vez de publicar una portada sin prerender', () => {
    expect(() => inyectarPortada('<body></body>', '<main></main>')).toThrow(/#root/)
  })
})
