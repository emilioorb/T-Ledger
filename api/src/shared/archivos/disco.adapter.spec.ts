import { mkdtemp, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
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

describe('una clave que se sale de la carpeta', () => {
  it('no llega a una carpeta hermana que empieza con el mismo nombre', () => {
    // `raiz-otra` empieza igual que `raiz`: comparar sin el separador la dejaba pasar.
    expect(() => disco.rutaLocalDe(`../${basename(raiz)}-otra/x.png`)).toThrow(/fuera de lugar/)
  })

  it('no sube por encima de la carpeta', () => {
    expect(() => disco.rutaLocalDe('../../etc/passwd')).toThrow(/fuera de lugar/)
  })

  it('una clave normal cae adentro', () => {
    expect(disco.rutaLocalDe('libros/lib_1/comprobantes/x.png').startsWith(raiz)).toBe(true)
  })
})
