import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { SE_BORRA, SE_CONSERVA, totalBorrado } from './vaciado.js'

// El esquema es la fuente, igual que en `clasificacion-de-modelos.spec.ts`. El `\r?` no sobra:
// `prisma format` escribe CRLF en Windows, y sin él la expresión no encuentra ningún modelo y
// la guardia queda desarmada en silencio.
const esquema = readFileSync(
  fileURLToPath(new URL('../../../../prisma/schema.prisma', import.meta.url)),
  'utf8',
)

const conLibro = [...esquema.matchAll(/^model (\w+) \{\r?\n([\s\S]*?)^\}/gm)]
  .filter(([, , cuerpo]) => /^\s+bookId\s+String/m.test(cuerpo!))
  .map(([, nombre]) => nombre!)

// Prisma expone los modelos en el cliente con la inicial en minúscula.
const comoEnElCliente = (modelo: string) => `${modelo[0]?.toLowerCase()}${modelo.slice(1)}`

const clasificados = new Set<string>([...SE_BORRA, ...SE_CONSERVA])

// Vaciar es una promesa difícil de comprobar a ojo: el resultado esperado es una pantalla sin
// nada, y una tabla que sobrevivió se ve igual que una tabla que estaba vacía. Sin esta
// guardia, la tabla que alguien agregue el mes que viene queda con datos del libro anterior y
// nadie se entera hasta que una cifra vieja reaparece en un reporte.
describe('vaciar el libro está clasificado tabla por tabla', () => {
  it('el esquema se pudo leer, si no los demás tests no prueban nada', () => {
    expect(conLibro.length).toBeGreaterThan(15)
  })

  it('toda tabla del libro o se borra o se conserva, a propósito', () => {
    const sinClasificar = conLibro.map(comoEnElCliente).filter((modelo) => !clasificados.has(modelo))

    expect(sinClasificar).toEqual([])
  })

  it('las dos listas no nombran tablas que ya no existen', () => {
    const existentes = new Set(conLibro.map(comoEnElCliente))
    const fantasmas = [...clasificados].filter((modelo) => !existentes.has(modelo))

    expect(fantasmas).toEqual([])
  })

  it('ninguna tabla está en las dos listas', () => {
    const enLasDos = SE_BORRA.filter((tabla) => (SE_CONSERVA as readonly string[]).includes(tabla))

    expect(enLasDos).toEqual([])
  })

  it('el registro de auditoría se conserva: el ADR-004 dice que no se borra', () => {
    expect(SE_CONSERVA).toContain('auditLog')
    expect(SE_BORRA as readonly string[]).not.toContain('auditLog')
  })

  it('las hijas se borran antes que las madres, o la base rechaza el borrado', () => {
    const antes = (tabla: string) => SE_BORRA.indexOf(tabla as (typeof SE_BORRA)[number])

    expect(antes('journalLine')).toBeLessThan(antes('journalEntry'))
    expect(antes('journalEntry')).toBeLessThan(antes('movement'))
    expect(antes('goalContribution')).toBeLessThan(antes('goal'))
    expect(antes('investmentContribution')).toBeLessThan(antes('investment'))
    expect(antes('bankLine')).toBeLessThan(antes('bankStatement'))
  })

  it('el total es la suma de lo borrado, que es lo que se le muestra a quien vació', () => {
    expect(totalBorrado({ movement: 148, journalEntry: 148, goal: 3 })).toBe(299)
    expect(totalBorrado({})).toBe(0)
  })
})
