import { describe, expect, it } from 'vitest'
import { unwrap } from '../../../../shared/kernel/result.js'
import type { AccountClass } from '../account-class.js'
import { Account } from '../account.js'
import { ChartOfAccounts } from '../chart-of-accounts.js'
import { buildFinancialPosition } from './financial-position.js'

const cuenta = (
  code: string,
  name: string,
  accountClass: AccountClass,
  parentCode: string | null,
) => unwrap(Account.create({ code, name, accountClass, parentCode, active: true, sortOrder: 0 }))

const chart = unwrap(
  ChartOfAccounts.create([
    cuenta('1000', 'Activos', 'ASSET', null),
    cuenta('1100', 'Efectivo y equivalentes', 'ASSET', '1000'),
    cuenta('1101', 'Caja colones', 'ASSET', '1100'),
    cuenta('1102', 'Caja dólares', 'ASSET', '1100'),
    cuenta('2000', 'Pasivos', 'LIABILITY', null),
    cuenta('2110', 'Tarjeta de crédito', 'LIABILITY', '2000'),
    cuenta('3000', 'Patrimonio', 'EQUITY', null),
    cuenta('3110', 'Aportes', 'EQUITY', '3000'),
    cuenta('4000', 'Ingresos', 'INCOME', null),
    cuenta('4100', 'Ingresos', 'INCOME', '4000'),
    cuenta('4110', 'Intereses ganados', 'INCOME', '4000'),
    cuenta('6000', 'Gastos operativos', 'OPERATING_EXPENSE', null),
    cuenta('6310', 'Servicios profesionales', 'OPERATING_EXPENSE', '6000'),
  ]),
)

// Un libro que cuadra: 1.021.688 de débitos contra otros tantos de créditos.
const totalesDeReferencia = [
  { accountCode: '1101', debits: 1_000_000_00n, credits: 219_698_00n },
  { accountCode: '2110', debits: 0n, credits: 500_000_00n },
  { accountCode: '3110', debits: 0n, credits: 300_000_00n },
  { accountCode: '4110', debits: 0n, credits: 1_990_00n },
  { accountCode: '6310', debits: 21_688_00n, credits: 0n },
]

describe('buildFinancialPosition', () => {
  it('cuadra: activo igual a pasivo más patrimonio', () => {
    const position = buildFinancialPosition(totalesDeReferencia, chart, 'CRC')

    expect(position.balances).toBe(true)
    expect(position.assets.minorUnits).toBe(
      position.liabilities.minorUnits + position.equity.minorUnits,
    )
  })

  it('el patrimonio incluye el resultado del período como línea derivada', () => {
    // Un gasto de 10.000 pagado de caja: activo -10.000, pasivo 0, resultado -10.000.
    const position = buildFinancialPosition(
      [
        { accountCode: '6310', debits: 10_000_00n, credits: 0n },
        { accountCode: '1101', debits: 0n, credits: 10_000_00n },
      ],
      chart,
      'CRC',
    )

    expect(position.assets.minorUnits).toBe(-10_000_00n)
    expect(position.liabilities.minorUnits).toBe(0n)
    expect(position.periodResult.minorUnits).toBe(-10_000_00n)
    expect(position.equity.minorUnits).toBe(-10_000_00n)
    expect(position.balances).toBe(true)
  })

  it('una cuenta agrupadora acumula el saldo de sus hijas', () => {
    const position = buildFinancialPosition(
      [
        { accountCode: '1101', debits: 5_000_00n, credits: 0n },
        { accountCode: '1102', debits: 3_000_00n, credits: 0n },
        { accountCode: '4100', debits: 0n, credits: 8_000_00n },
      ],
      chart,
      'CRC',
    )

    expect(position.nodeFor('1100')?.balance.minorUnits).toBe(8_000_00n)
    expect(position.nodeFor('1000')?.balance.minorUnits).toBe(8_000_00n)
  })

  it('el resultado del período viaja en el árbol de patrimonio', () => {
    const position = buildFinancialPosition(
      [
        { accountCode: '6310', debits: 10_000_00n, credits: 0n },
        { accountCode: '1101', debits: 0n, credits: 10_000_00n },
      ],
      chart,
      'CRC',
    )

    const derivada = position.sections.equity.at(-1)
    expect(derivada?.balance.minorUnits).toBe(-10_000_00n)
    expect(chart.byCode(derivada?.accountCode ?? '')).toBeUndefined()
  })

  it('las cuentas de resultado no aparecen en el estado de situación', () => {
    const position = buildFinancialPosition(totalesDeReferencia, chart, 'CRC')

    expect(position.nodeFor('4110')).toBeUndefined()
    expect(position.nodeFor('6310')).toBeUndefined()
  })

  it('un libro vacío cuadra en cero', () => {
    const position = buildFinancialPosition([], chart, 'CRC')
    expect(position.balances).toBe(true)
    expect(position.assets.isZero()).toBe(true)
  })
})
