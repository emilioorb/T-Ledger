import { describe, expect, it } from 'vitest'
import {
  claveDeComprobante,
  claveDeDocumentoDeDeuda,
  esDelLibro,
  revisar,
  TAMANO_MAXIMO,
  TAMANO_MAXIMO_DOCUMENTO,
  enTandas,
  prefijoDelLibro,
} from './archivo.js'

describe('qué se acepta como comprobante', () => {
  it('una foto y un PDF pasan', () => {
    expect(revisar({ mimetype: 'image/jpeg', size: 1_000 })).toBeNull()
    expect(revisar({ mimetype: 'application/pdf', size: 1_000 })).toBeNull()
  })

  it('un ejecutable no, aunque lo renombren', () => {
    // El tipo llega en la petición y lo pone quien sube: la lista cerrada es lo único que
    // impide que el bucket termine sirviendo cualquier cosa desde nuestro dominio.
    expect(revisar({ mimetype: 'application/x-msdownload', size: 1_000 })).toBe('tipo')
    expect(revisar({ mimetype: 'text/html', size: 1_000 })).toBe('tipo')
  })

  it('pasado el límite no entra', () => {
    expect(revisar({ mimetype: 'image/png', size: TAMANO_MAXIMO })).toBeNull()
    expect(revisar({ mimetype: 'image/png', size: TAMANO_MAXIMO + 1 })).toBe('tamano')
  })

  it('un archivo vacío no es un comprobante', () => {
    expect(revisar({ mimetype: 'image/png', size: 0 })).toBe('vacio')
  })
})

describe('cómo se nombra el archivo guardado', () => {
  it('lleva el libro adelante, para poder borrar un libro entero por prefijo', () => {
    const clave = claveDeComprobante('lib_1', 'mov_1', 'image/png', 'abc123')

    expect(clave).toBe('libros/lib_1/comprobantes/mov_1-abc123.png')
  })

  it('la extensión sale del tipo y no del nombre que traía', () => {
    expect(claveDeComprobante('l', 'm', 'application/pdf', 'x')).toMatch(/\.pdf$/)
    expect(claveDeComprobante('l', 'm', 'image/jpeg', 'x')).toMatch(/\.jpg$/)
  })

  it('dos subidas al mismo movimiento no se pisan', () => {
    const una = claveDeComprobante('l', 'm', 'image/png', 'aaa')
    const otra = claveDeComprobante('l', 'm', 'image/png', 'bbb')

    expect(una).not.toBe(otra)
  })
})

describe('de qué libro es un comprobante', () => {
  it('el prefijo dice a quién pertenece', () => {
    expect(esDelLibro('libros/lib_1/comprobantes/x.png', 'lib_1')).toBe(true)
    expect(esDelLibro('libros/lib_1/comprobantes/x.png', 'lib_2')).toBe(false)
  })

  it('un libro cuyo nombre empieza igual que otro no cuela', () => {
    // Sin la barra final, `lib_1` daría por bueno todo lo de `lib_10`.
    expect(esDelLibro('libros/lib_10/comprobantes/x.png', 'lib_1')).toBe(false)
  })

  it('una clave que se sale del árbol tampoco', () => {
    expect(esDelLibro('../../etc/passwd', 'lib_1')).toBe(false)
    expect(esDelLibro('libros/otro/../lib_1/x.png', 'lib_1')).toBe(false)
  })
})

describe('el documento de una deuda', () => {
  it('acepta un contrato escaneado más pesado que un comprobante', () => {
    expect(revisar({ mimetype: 'application/pdf', size: TAMANO_MAXIMO + 1 }, TAMANO_MAXIMO_DOCUMENTO)).toBeNull()
    expect(revisar({ mimetype: 'application/pdf', size: TAMANO_MAXIMO_DOCUMENTO + 1 }, TAMANO_MAXIMO_DOCUMENTO)).toBe('tamano')
  })

  it('se guarda bajo el libro, aparte de los comprobantes', () => {
    const clave = claveDeDocumentoDeDeuda('lib_1', 'deuda_1', 'application/pdf', 'abc123')
    expect(clave).toBe('libros/lib_1/documentos/deudas/deuda_1-abc123.pdf')
    expect(esDelLibro(clave, 'lib_1')).toBe(true)
  })
})

describe('los archivos de un libro entero', () => {
  it('viven bajo su prefijo', () => {
    expect(prefijoDelLibro('lib_1')).toBe('libros/lib_1/')
  })

  // Es lo que se le pasa a un borrado masivo: un prefijo vacío o mal armado vaciaría el bucket.
  it('no arma un prefijo con un id vacío o que se sale de su carpeta', () => {
    expect(() => prefijoDelLibro('')).toThrow()
    expect(() => prefijoDelLibro('../otro')).toThrow()
    expect(() => prefijoDelLibro('lib/1')).toThrow()
  })

  it('reparte las claves en tandas de mil, que es lo que acepta R2 por llamada', () => {
    const claves = Array.from({ length: 2501 }, (_, i) => `k${i}`)
    expect(enTandas(claves, 1000).map((tanda) => tanda.length)).toEqual([1000, 1000, 501])
  })
})
