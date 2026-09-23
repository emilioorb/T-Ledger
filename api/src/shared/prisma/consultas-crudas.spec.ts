import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

// Una consulta cruda no pasa por la extensión que filtra por libro (ADR-002). Pasó: el
// patrimonio de un libro sumaba los asientos de todos. Toda consulta cruda tiene que escribir
// el filtro a mano, y este test lo exige para las que vengan.
const SRC = path.resolve(import.meta.dirname, '../..')
const CRUDA = /\$(queryRaw|executeRaw)(Unsafe)?\s*(<[^`]*?>)?\s*`([\s\S]*?)`/g

const fuentes = (dir: string): string[] =>
  readdirSync(dir).flatMap((nombre) => {
    const ruta = path.join(dir, nombre)
    if (statSync(ruta).isDirectory()) return nombre === 'generated' ? [] : fuentes(ruta)
    return /\.ts$/.test(nombre) && !/\.spec\.ts$/.test(nombre) ? [ruta] : []
  })

describe('consultas crudas', () => {
  it('todas filtran por libro escribiendo el bookId a mano', () => {
    const sinFiltro = fuentes(SRC).flatMap((archivo) =>
      [...readFileSync(archivo, 'utf8').matchAll(CRUDA)]
        .filter(([, , , , sql]) => !/"bookId"\s*=/.test(sql ?? ''))
        .map(() => path.relative(SRC, archivo)),
    )

    expect(sinFiltro).toEqual([])
  })

  it('la regla ve las consultas que tiene que ver', () => {
    const hallada = [...readFileSync(path.join(SRC, 'modules/accounting/infrastructure/prisma-journal.repository.ts'), 'utf8').matchAll(CRUDA)]

    expect(hallada).toHaveLength(1)
  })
})
