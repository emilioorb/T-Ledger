import { describe, expect, it } from 'vitest'
import { Money } from '../../../shared/kernel/money.js'
import { isErr, unwrap } from '../../../shared/kernel/result.js'
import { Category } from './category.js'
import { Movement, type MovementProps } from './movement.js'

const crc = (minorUnits: bigint) => Money.fromMinorUnits(minorUnits, 'CRC')
const utc = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

const props = (overrides: Partial<MovementProps> = {}): MovementProps => ({
  id: 'm1',
  date: utc('2026-09-16'),
  kind: 'EXPENSE',
  categoryId: 'c1',
  counterparty: 'Anthropic',
  amount: crc(20_000_00n),
  paymentAccountCode: '1101',
  receiptUrl: null,
  status: 'ACTIVE',
  ...overrides,
})

describe('Movement', () => {
  it('rechaza un monto de cero o negativo', () => {
    expect(isErr(Movement.create(props({ amount: crc(0n) })))).toBe(true)
    expect(isErr(Movement.create(props({ amount: crc(-1n) })))).toBe(true)
  })

  it('rechaza una contraparte vacía', () => {
    expect(isErr(Movement.create(props({ counterparty: '  ' })))).toBe(true)
  })

  it('rechaza una fecha inválida', () => {
    expect(isErr(Movement.create(props({ date: new Date('no es fecha') })))).toBe(true)
  })

  it('anular devuelve un movimiento nuevo, sin mutar el original', () => {
    const original = unwrap(Movement.create(props()))
    const anulado = original.void_()

    expect(anulado.isVoided()).toBe(true)
    expect(original.isVoided()).toBe(false)
  })

  it('anular dos veces no cambia nada la segunda', () => {
    const anulado = unwrap(Movement.create(props())).void_()
    expect(anulado.void_().isVoided()).toBe(true)
  })
})

describe('Category', () => {
  it('es contabilizable solo si tiene cuenta y está activa', () => {
    const base = { id: 'c1', name: 'Marketing', kind: 'EXPENSE' as const, sortOrder: 0 }

    expect(unwrap(Category.create({ ...base, accountCode: '6210', active: true })).isPostable()).toBe(true)
    expect(unwrap(Category.create({ ...base, accountCode: null, active: true })).isPostable()).toBe(false)
    expect(unwrap(Category.create({ ...base, accountCode: '6210', active: false })).isPostable()).toBe(false)
  })

  it('rechaza un nombre vacío', () => {
    expect(
      isErr(
        Category.create({ id: 'c1', name: ' ', kind: 'EXPENSE', accountCode: null, sortOrder: 0, active: true }),
      ),
    ).toBe(true)
  })
})
