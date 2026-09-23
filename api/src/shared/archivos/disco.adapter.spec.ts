import { mkdtemp, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { prefijoDelLibro } from './archivo.js'
import { DiscoAdapter } from './disco.adapter.js'

let raiz: string
let disco: DiscoAdapter

const existe = (ruta: string) => stat(ruta).then(() => true, () => false)

beforeEach(async () => {
  raiz = await mkdtemp(join(tmpdir(), 'disco-'))
  disco = new DiscoAdapter(raiz)
})

afterEach(() => rm(raiz, { recursive: true, force: true }))

describe('borrar todo lo de un libro', () => {
  it('se lleva sus archivos y deja los del libro de al lado', async () => {
    const contenido = Buffer.from('x')
    await disco.guardar({ clave: 'libros/lib_a/comprobantes/m1.pdf', contenido, tipo: 'application/pdf' })
    await disco.guardar({ clave: 'libros/lib_a/documentos/deudas/d1.pdf', contenido, tipo: 'application/pdf' })
    await disco.guardar({ clave: 'libros/lib_b/comprobantes/m2.pdf', contenido, tipo: 'application/pdf' })

    await disco.borrarTodoBajo(prefijoDelLibro('lib_a'))

    expect(await existe(join(raiz, 'libros/lib_a'))).toBe(false)
    expect(await existe(join(raiz, 'libros/lib_b/comprobantes/m2.pdf'))).toBe(true)
  })

  it('un libro sin archivos no es un error', async () => {
    await expect(disco.borrarTodoBajo(prefijoDelLibro('lib_vacio'))).resolves.toBeUndefined()
  })
})
