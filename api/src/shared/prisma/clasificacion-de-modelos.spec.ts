import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { SIN_LIBRO } from './libro-filter.extension.js'

// Se lee el esquema y no `Prisma.dmmf`: el generador nuevo de Prisma 7 no lo expone, y aunque
// lo hiciera, el archivo es la fuente de verdad y no una API interna que cambia de versión a
// versión.
const esquema = readFileSync(
  fileURLToPath(new URL('../../../prisma/schema.prisma', import.meta.url)),
  'utf8',
)

// El `\r?` no sobra: `prisma format` reescribe el esquema con los finales de línea de la
// plataforma, y en Windows eso son CRLF. Sin él la expresión no encontraba **ningún** modelo y
// esta guardia —la que sostiene el aislamiento entre libros— quedaba desarmada en silencio.
// Se supo porque el primer test comprueba que el esquema se haya podido leer.
const modelos = [...esquema.matchAll(/^model (\w+) \{\r?\n([\s\S]*?)^\}/gm)].map(
  ([, nombre, cuerpo]) => ({
    nombre: nombre!,
    tieneBookId: /^\s+bookId\s+String/m.test(cuerpo!),
  }),
)

const conLibro = modelos.filter((m) => m.tieneBookId).map((m) => m.nombre)
const nombres = new Set(modelos.map((m) => m.nombre))

// Esta es la guardia que el resto del aislamiento no puede darse a sí mismo. `SIN_LIBRO` es
// una lista de nombres escritos a mano: nada en el compilador la ata al esquema. Sin estos
// tests, agregar un modelo y olvidarse del `bookId` no falla al compilar, falla en producción
// la primera vez que alguien lo consulta; y ponerlo en la lista por descuido lo deja sin
// aislar para siempre, en silencio.
describe('todo modelo está clasificado', () => {
  it('el esquema se pudo leer, si no los demás tests no prueban nada', () => {
    expect(modelos.length).toBeGreaterThan(20)
  })

  it('o lleva bookId, o está en la lista de los que no', () => {
    const sinClasificar = modelos
      .filter((m) => !m.tieneBookId && !SIN_LIBRO.has(m.nombre))
      .map((m) => m.nombre)

    expect(sinClasificar).toEqual([])
  })

  it('ninguno está en la lista teniendo bookId: sería pedir que no se aísle algo que sí puede', () => {
    expect([...SIN_LIBRO].filter((nombre) => conLibro.includes(nombre))).toEqual([])
  })

  it('la lista no nombra modelos que ya no existen', () => {
    expect([...SIN_LIBRO].filter((nombre) => !nombres.has(nombre))).toEqual([])
  })

  it('son veinte los que llevan libro, y ExchangeRate no es uno', () => {
    // El número exacto está a propósito: si alguien suma una tabla al libro, este test lo
    // obliga a pasar por acá y confirmar que era lo que quería. El diecinueve es `AuditLog`,
    // que lleva libro como cualquier otra: el rastro de un libro no se mira desde otro. El
    // veinte es `DebtPayment`: los pagos de una deuda son del libro de la deuda.
    expect(conLibro).toHaveLength(20)
    expect(conLibro).not.toContain('ExchangeRate')
  })
})
