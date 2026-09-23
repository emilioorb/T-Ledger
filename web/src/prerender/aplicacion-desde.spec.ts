import { describe, expect, it } from 'vitest'
import indexReal from '../../index.html?raw'
import { aplicacionDesde } from './aplicacion-desde'
import { inyectarPortada } from './inyectar-portada'

const INDEX = `<!doctype html>
<html lang="es" data-theme="light">
  <head>
    <!-- Antes del primer pintado -->
    <script src="/antes-de-pintar.js"></script>
    <script type="module" crossorigin src="/assets/main-x.js"></script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`

describe('aplicacionDesde', () => {
  const app = aplicacionDesde(INDEX)

  it('no lleva el script de antes de pintar: en otra ruta redirigiría al tablero en bucle', () => {
    expect(app).not.toContain('antes-de-pintar')
  })

  it('abre en el tema de adentro de la app, el oscuro', () => {
    expect(app).toContain('<html lang="es" data-theme="dark">')
  })

  it('conserva el resto: los assets y el #root vacío', () => {
    expect(app).toContain('<script type="module" crossorigin src="/assets/main-x.js"></script>')
    expect(app).toContain('<div id="root"></div>')
  })

  it('falla si no encuentra el <html> al que cambiarle el tema, en vez de publicar app.html en claro', () => {
    expect(() => aplicacionDesde(INDEX.replace('<html lang="es" data-theme="light">', '<html>'))).toThrow(/data-theme/)
  })

  it('falla si la plantilla cambió y ya no sabe qué sacar', () => {
    expect(() => aplicacionDesde('<html><head></head></html>')).toThrow(/antes-de-pintar/)
  })

  it('funciona con el index.html real: si la plantilla cambia, lo avisa el test y no el build', () => {
    const app = aplicacionDesde(indexReal)

    expect(app).not.toContain('antes-de-pintar')
    expect(app).toContain('data-theme="dark"')
    expect(inyectarPortada(indexReal, '<main></main>')).toContain('<div id="root"><main></main></div>')
  })
})
