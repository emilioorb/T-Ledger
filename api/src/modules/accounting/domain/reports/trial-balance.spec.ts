import { describe, expect, it } from 'vitest'
import { unwrap } from '../../../../shared/kernel/result.js'
import type { AccountClass } from '../account-class.js'
import { Account } from '../account.js'
import { ChartOfAccounts } from '../chart-of-accounts.js'
import { buildTrialBalance } from './trial-balance.js'

const cuenta = (code: string, name: string, accountClass: AccountClass, parentCode: string | null) =>
  unwrap(Account.create({ code, name, accountClass, parentCode, active: true, sortOrder: 0 }))

const chart = unwrap(
  ChartOfAccounts.create([
    cuenta('1000', 'Activos', 'ASSET', null),
    cuenta('1100', 'Efectivo y equivalentes', 'ASSET', '1000'),
    cuenta('1101', 'Caja colones', 'ASSET', '1100'),
    cuenta('2000', 'Pasivos', 'LIABILITY', null),
    cuenta('2110', 'Tarjeta de crédito', 'LIABILITY', '2000'),
    cuenta('4000', 'Ingresos', 'INCOME', null),
    cuenta('4110', 'Intereses ganados', 'INCOME', '4000'),
    cuenta('6000', 'Gastos operativos', 'OPERATING_EXPENSE', null),
    cuenta('6310', 'Servicios profesionales', 'OPERATING_EXPENSE', '6000'),
  ]),
)

describe('buildTrialBalance', () => {
  it('reproduce las filas de una comprobación con su saldo con signo', () => {
    const balance = buildTrialBalance(
      [
        { accountCode: '1101', debits: 0n, credits: 219_698_00n },
        { accountCode: '2110', debits: 0n, credits: 500_000_00n },
        { accountCode: '4110', debits: 0n, credits: 1_990_00n },
      ],
      chart,
      'CRC',
    )

    expect(balance.rows.map((r) => [r.accountCode, r.balance.minorUnits])).toEqual([
      ['1101', -219_698_00n],
      ['2110', 500_000_00n],
      ['4110', 1_990_00n],
    ])
  })

  it('cuadra cuando débitos y créditos coinciden', () => {
    const balance = buildTrialBalance(
      [
        { accountCode: '6310', debits: 20_000_00n, credits: 0n },
        { accountCode: '1101', debits: 0n, credits: 20_000_00n },
      ],
      chart,
      'CRC',
    )

    expect(balance.balances).toBe(true)
    expect(balance.difference.minorUnits).toBe(0n)
  })

  it('cuando no cuadra, la diferencia queda a la vista con su signo', () => {
    const balance = buildTrialBalance(
      [
        { accountCode: '6310', debits: 20_000_00n, credits: 0n },
        { accountCode: '1101', debits: 0n, credits: 19_000_00n },
      ],
      chart,
      'CRC',
    )

    expect(balance.balances).toBe(false)
    expect(balance.difference.minorUnits).toBe(1_000_00n)
  })

  it('deja fuera las cuentas sin movimiento en el período', () => {
    const balance = buildTrialBalance([{ accountCode: '6310', debits: 1n, credits: 0n }], chart, 'CRC')
    expect(balance.rows.map((r) => r.accountCode)).toEqual(['6310'])
  })

  it('un período sin movimientos cuadra en cero', () => {
    const balance = buildTrialBalance([], chart, 'CRC')
    expect(balance.rows).toEqual([])
    expect(balance.balances).toBe(true)
  })
})
