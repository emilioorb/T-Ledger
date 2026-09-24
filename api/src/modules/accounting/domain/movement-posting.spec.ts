import { describe, expect, it } from 'vitest'
import { Money } from '../../../shared/kernel/money.js'
import { isErr, unwrap } from '../../../shared/kernel/result.js'
import { Account } from './account.js'
import { Category } from './category.js'
import { ChartOfAccounts } from './chart-of-accounts.js'
import { Movement, type MovementProps } from './movement.js'
import { postingFor } from './movement-posting.js'

const crc = (minorUnits: bigint) => Money.fromMinorUnits(minorUnits, 'CRC')
const utc = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

const cuenta = (
  code: string,
  name: string,
  accountClass: 'ASSET' | 'INCOME' | 'OPERATING_EXPENSE',
  parentCode: string | null,
) => unwrap(Account.create({ code, name, accountClass, parentCode, active: true, sortOrder: 0 }))

const chart = unwrap(
  ChartOfAccounts.create([
    cuenta('1000', 'Activos', 'ASSET', null),
    cuenta('1100', 'Efectivo', 'ASSET', '1000'),
    cuenta('1101', 'Caja colones', 'ASSET', '1100'),
    cuenta('4000', 'Ingresos', 'INCOME', null),
    cuenta('4110', 'Ingresos por suscripciones', 'INCOME', '4000'),
    cuenta('6000', 'Gastos operativos', 'OPERATING_EXPENSE', null),
    cuenta('6210', 'Marketing y publicidad', 'OPERATING_EXPENSE', '6000'),
  ]),
)

const categoria = (kind: 'EXPENSE' | 'INCOME', accountCode: string | null) =>
  unwrap(
    Category.create({
      id: 'c1',
      name: 'Marketing',
      kind,
      accountCode,
      sortOrder: 0,
      active: true,
      colorIndex: null,
    }),
  )

const movimiento = (overrides: Partial<MovementProps> = {}) =>
  unwrap(
    Movement.create({
      id: 'm1',
      date: utc('2026-09-16'),
      kind: 'EXPENSE',
      categoryId: 'c1',
      counterparty: 'Anthropic',
      amount: crc(20_000_00n),
      paymentAccountCode: '1101',
      receiptKey: null,
      status: 'ACTIVE',
      version: 0,
      ...overrides,
    }),
  )

describe('postingFor', () => {
  it('un gasto debita la cuenta de la categoría y acredita la de pago', () => {
    const entry = unwrap(postingFor(movimiento(), categoria('EXPENSE', '6210'), chart, 'a1'))

    expect(entry?.lines.map((l) => [l.accountCode, l.side, l.amount.minorUnits])).toEqual([
      ['6210', 'DEBIT', 20_000_00n],
      ['1101', 'CREDIT', 20_000_00n],
    ])
    expect(entry?.sourceMovementId).toBe('m1')
  })

  it('un ingreso acredita la cuenta de la categoría y debita la de cobro', () => {
    const entry = unwrap(
      postingFor(
        movimiento({ kind: 'INCOME', counterparty: 'Sponsors' }),
        categoria('INCOME', '4110'),
        chart,
        'a2',
      ),
    )

    expect(entry?.lines.map((l) => [l.accountCode, l.side])).toEqual([
      ['1101', 'DEBIT'],
      ['4110', 'CREDIT'],
    ])
  })

  it('una categoría sin cuenta produce un movimiento sin asiento, no un error', () => {
    const result = postingFor(movimiento(), categoria('EXPENSE', null), chart, 'a3')

    expect(isErr(result)).toBe(false)
    expect(unwrap(result)).toBeNull()
  })

  it('un movimiento sin cuenta de pago tampoco se contabiliza', () => {
    const result = postingFor(
      movimiento({ paymentAccountCode: null }),
      categoria('EXPENSE', '6210'),
      chart,
      'a4',
    )

    expect(unwrap(result)).toBeNull()
  })

  it('el asiento cuadra siempre, por construcción', () => {
    const entry = unwrap(postingFor(movimiento(), categoria('EXPENSE', '6210'), chart, 'a5'))

    expect(entry?.totalFor('CRC', 'DEBIT').minorUnits).toBe(
      entry?.totalFor('CRC', 'CREDIT').minorUnits,
    )
  })

  it('falla si el tipo del movimiento no coincide con el de su categoría', () => {
    expect(isErr(postingFor(movimiento(), categoria('INCOME', '4110'), chart, 'a6'))).toBe(true)
  })

  it('falla si la cuenta de la categoría no acepta asientos', () => {
    expect(isErr(postingFor(movimiento(), categoria('EXPENSE', '6000'), chart, 'a7'))).toBe(true)
  })

  it('no contabiliza un movimiento anulado', () => {
    const result = postingFor(
      movimiento({ status: 'VOIDED' }),
      categoria('EXPENSE', '6210'),
      chart,
      'a8',
    )

    expect(unwrap(result)).toBeNull()
  })
})
