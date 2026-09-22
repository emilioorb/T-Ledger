import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { puedeBorrarse } from './borrado.js'

describe('puedeBorrarse', () => {
  it('no deja borrar el único libro de la persona', () => {
    expect(puedeBorrarse(1)).toBe(false)
  })

  it('deja borrar cuando le queda otro', () => {
    expect(puedeBorrarse(2)).toBe(true)
  })
})

// Borrar un libro es borrar la fila de `book` y dejar que la base se lleve el resto. Eso solo
// es cierto si cada tabla que lo referencia cae en cascada: una que no, frena el borrado con
// un error de clave foránea en producción, y el test de integración no la ve si no la llena.
describe('el esquema', () => {
  const esquema = readFileSync(
    fileURLToPath(new URL('../../../../prisma/schema.prisma', import.meta.url)),
    'utf8',
  )
  const relacionesConElLibro = esquema
    .split(/\r?\n/)
    .filter((linea) => /^\s+\w+\s+book\??\s+@relation/.test(linea))

  it('encuentra las relaciones con el libro', () => {
    expect(relacionesConElLibro.length).toBeGreaterThan(10)
  })

  it.each(relacionesConElLibro)('borra en cascada: %s', (linea) => {
    expect(linea).toContain('onDelete: Cascade')
  })
})
