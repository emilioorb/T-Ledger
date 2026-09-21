import { describe, expect, it } from 'vitest'
import { Money } from '../../../shared/kernel/money.js'
import type { StoredBankLine } from './bank-line.js'
import { suggestMatches, type MovementCandidate } from './reconciliation.js'

const crc = (minorUnits: bigint) => Money.fromMinorUnits(minorUnits, 'CRC')
const utc = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

const linea = (
  id: string,
  date: string,
  minorUnits: bigint,
  reference: string | null = null,
): StoredBankLine => ({
  id,
  statementId: 'ext',
  bankAccountId: 'cuenta',
  date: utc(date),
  description: 'SUPERMERCADO',
  reference,
  amount: crc(minorUnits),
  hash: `hash-${id}`,
  status: 'PENDING',
  movementId: null,
})

const movimiento = (
  id: string,
  date: string,
  minorUnits: bigint,
  receiptUrl: string | null = null,
  kind: 'EXPENSE' | 'INCOME' = 'EXPENSE',
): MovementCandidate => ({
  id,
  date: utc(date),
  amount: crc(minorUnits),
  receiptUrl,
  kind,
})

describe('suggestMatches', () => {
  it('una línea y un movimiento con mismo monto y misma fecha es coincidencia exacta', () => {
    const [match] = suggestMatches(
      [linea('l1', '2026-09-15', -45_000_00n)],
      [movimiento('m1', '2026-09-15', 45_000_00n)],
    )

    expect(match).toMatchObject({ lineId: 'l1', movementId: 'm1', score: 100, reason: 'EXACT' })
  })

  it('el mismo monto hasta tres días después sigue siendo coincidencia', () => {
    const [match] = suggestMatches(
      [linea('l1', '2026-09-15', -45_000_00n)],
      [movimiento('m1', '2026-09-17', 45_000_00n)],
    )

    expect(match).toMatchObject({ score: 80, reason: 'NEAR_DATE' })
  })

  it('más de tres días ya no coincide por fecha', () => {
    expect(
      suggestMatches(
        [linea('l1', '2026-09-15', -45_000_00n)],
        [movimiento('m1', '2026-09-25', 45_000_00n)],
      ),
    ).toEqual([])
  })

  it('la referencia del banco dentro del comprobante coincide aunque cambie el monto', () => {
    const [match] = suggestMatches(
      [linea('l1', '2026-09-15', -45_000_00n, 'REF123')],
      [movimiento('m1', '2026-09-15', 44_000_00n, 'factura REF123')],
    )

    expect(match).toMatchObject({ reason: 'REFERENCE', score: 70 })
  })

  it('un gasto del banco no se cruza con un ingreso del mismo monto', () => {
    // La línea negativa sale de la cuenta: solo puede ser un gasto.
    expect(
      suggestMatches(
        [linea('l1', '2026-09-15', -45_000_00n)],
        [movimiento('m1', '2026-09-15', 45_000_00n, null, 'INCOME')],
      ),
    ).toEqual([])
  })

  it('una línea positiva sí se cruza con un ingreso', () => {
    const [match] = suggestMatches(
      [linea('l1', '2026-09-15', 1_500_000_00n)],
      [movimiento('m1', '2026-09-15', 1_500_000_00n, null, 'INCOME')],
    )

    expect(match?.reason).toBe('EXACT')
  })

  it('un movimiento ya sugerido para una línea no se ofrece para otra', () => {
    const matches = suggestMatches(
      [linea('l1', '2026-09-15', -45_000_00n), linea('l2', '2026-09-16', -45_000_00n)],
      [movimiento('m1', '2026-09-15', 45_000_00n)],
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]?.lineId).toBe('l1')
  })

  it('dos candidatos con el mismo puntaje se devuelven marcados como ambiguos', () => {
    const matches = suggestMatches(
      [linea('l1', '2026-09-15', -45_000_00n)],
      [movimiento('m1', '2026-09-15', 45_000_00n), movimiento('m2', '2026-09-15', 45_000_00n)],
    )

    expect(matches).toHaveLength(2)
    expect(matches.every((match) => match.ambiguous)).toBe(true)
  })

  it('la coincidencia exacta gana sobre la cercana', () => {
    const [match] = suggestMatches(
      [linea('l1', '2026-09-15', -45_000_00n)],
      [movimiento('m1', '2026-09-17', 45_000_00n), movimiento('m2', '2026-09-15', 45_000_00n)],
    )

    expect(match?.movementId).toBe('m2')
  })

  it('sin candidatos no inventa sugerencias', () => {
    expect(suggestMatches([linea('l1', '2026-09-15', -45_000_00n)], [])).toEqual([])
  })

  it('sin líneas pendientes no devuelve nada', () => {
    expect(suggestMatches([], [movimiento('m1', '2026-09-15', 45_000_00n)])).toEqual([])
  })
})
