import { describe, expect, it } from 'vitest'
import { leerNovedades, releases } from './release-notes'

describe('novedades.md', () => {
  // La prueba que reemplaza al tipado que se perdió al pasar las notas a Markdown: si alguien
  // escribe mal una entrega, falla acá y no en la pantalla.
  it('se lee entero, con fecha y al menos un grupo en cada entrega', () => {
    expect(releases.length).toBeGreaterThan(0)
    for (const entrega of releases) {
      expect(entrega.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(Object.values(entrega.grupos).some((cuerpo) => cuerpo !== '')).toBe(true)
    }
  })

  it('va de la entrega más reciente a la más vieja', () => {
    const fechas = releases.map((entrega) => entrega.date)
    expect(fechas).toEqual([...fechas].sort().reverse())
  })
})

describe('leerNovedades', () => {
  const ENTREGA = `# Preámbulo que no se muestra

## 2026-10-01 · v1.2.0

### Nuevo

- Algo **nuevo**
  - con un detalle

### Corregido

- Algo roto
`

  it('parte en entregas y grupos, y conserva el Markdown de adentro', () => {
    const [entrega] = leerNovedades(ENTREGA)
    expect(entrega).toEqual({
      date: '2026-10-01',
      version: '1.2.0',
      grupos: { added: '- Algo **nuevo**\n  - con un detalle', improved: '', fixed: '- Algo roto' },
    })
  })

  it('rechaza un grupo que no existe', () => {
    expect(() => leerNovedades('## 2026-10-01 · v1.0.0\n\n### Otro\n\n- x')).toThrow(
      /«Otro» no es un grupo/,
    )
  })

  it('rechaza una entrega sin fecha o sin versión', () => {
    expect(() => leerNovedades('## Octubre · v1.0.0\n')).toThrow(/AAAA-MM-DD · vX.Y.Z/)
    expect(() => leerNovedades('## 2026-10-01\n')).toThrow(/AAAA-MM-DD · vX.Y.Z/)
  })
})
