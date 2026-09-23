import { describe, expect, it } from 'vitest'
import { postergarJavaScript } from './postergar-javascript'

const INDEX = `<head>
    <script type="module" crossorigin src="/assets/index-a.js"></script>
    <link rel="modulepreload" crossorigin href="/assets/jsx-runtime-b.js">
    <link rel="modulepreload" crossorigin href="/assets/router-c.js">
    <link rel="stylesheet" crossorigin href="/assets/index-d.css">
  </head>`

describe('postergarJavaScript', () => {
  const html = postergarJavaScript(INDEX)

  it('saca las precargas de módulos, que le quitaban ancho de banda al CSS', () => {
    expect(html).not.toContain('modulepreload')
  })

  it('pide el script de entrada con prioridad baja, detrás del CSS', () => {
    expect(html).toContain('<script type="module" crossorigin fetchpriority="low" src="/assets/index-a.js"></script>')
  })

  it('deja el CSS como estaba', () => {
    expect(html).toContain('<link rel="stylesheet" crossorigin href="/assets/index-d.css">')
  })

  it('falla si no encuentra el script de entrada, en vez de publicar sin tocar nada', () => {
    expect(() => postergarJavaScript('<head></head>')).toThrow(/script/)
  })
})
