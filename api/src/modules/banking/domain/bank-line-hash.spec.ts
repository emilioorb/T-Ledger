import { describe, expect, it } from 'vitest'
import { Money } from '../../../shared/kernel/money.js'
import type { ParsedLine } from './bank-line.js'
import { hashOfLine } from './bank-line-hash.js'

const crc = (minorUnits: bigint) => Money.fromMinorUnits(minorUnits, 'CRC')
const utc = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

const linea = (overrides: Partial<ParsedLine> = {}): ParsedLine => ({
  date: utc('2026-09-15'),
  description: 'SUPERMERCADO',
  reference: 'REF1',
  amount: crc(-45_000_00n),
  ...overrides,
})

describe('hashOfLine', () => {
  it('dos líneas iguales de la misma cuenta dan el mismo hash', () => {
    expect(hashOfLine('cuenta', linea())).toBe(hashOfLine('cuenta', linea()))
  })

  it('la misma línea en otra cuenta da otro hash', () => {
    expect(hashOfLine('cuenta-a', linea())).not.toBe(hashOfLine('cuenta-b', linea()))
  })

  it('cambia con la fecha, el monto, la descripción y la referencia', () => {
    const base = hashOfLine('cuenta', linea())

    expect(hashOfLine('cuenta', linea({ date: utc('2026-09-16') }))).not.toBe(base)
    expect(hashOfLine('cuenta', linea({ amount: crc(-45_000_01n) }))).not.toBe(base)
    expect(hashOfLine('cuenta', linea({ description: 'OTRO' }))).not.toBe(base)
    expect(hashOfLine('cuenta', linea({ reference: 'REF2' }))).not.toBe(base)
  })

  it('no distingue mayúsculas ni espacios de más en la descripción', () => {
    expect(hashOfLine('cuenta', linea({ description: '  supermercado ' }))).toBe(
      hashOfLine('cuenta', linea()),
    )
  })

  it('una línea sin referencia tiene hash estable', () => {
    expect(hashOfLine('cuenta', linea({ reference: null }))).toBe(
      hashOfLine('cuenta', linea({ reference: null })),
    )
  })
})
