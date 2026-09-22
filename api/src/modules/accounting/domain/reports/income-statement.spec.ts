import { describe, expect, it } from 'vitest'
import { unwrap } from '../../../../shared/kernel/result.js'
import type { AccountClass } from '../account-class.js'
import { Account } from '../account.js'
import { ChartOfAccounts } from '../chart-of-accounts.js'
import { buildIncomeStatement } from './income-statement.js'

const cuenta = (
  code: string,
  name: string,
  accountClass: AccountClass,
  parentCode: string | null,
) => unwrap(Account.create({ code, name, accountClass, parentCode, active: true, sortOrder: 0 }))

const chart = unwrap(
  ChartOfAccounts.create([
    cuenta('1000', 'Activos', 'ASSET', null),
    cuenta('1101', 'Caja colones', 'ASSET', '1000'),
    cuenta('4000', 'Ingresos', 'INCOME', null),
    cuenta('4100', 'Salario', 'INCOME', '4000'),
    cuenta('4110', 'Intereses ganados', 'INCOME', '4000'),
    cuenta('5000', 'Costo de ingresos', 'COST_OF_REVENUE', null),
    cuenta('5110', 'Comisiones', 'COST_OF_REVENUE', '5000'),
    cuenta('6000', 'Gastos operativos', 'OPERATING_EXPENSE', null),
    cuenta('6100', 'Gastos generales', 'OPERATING_EXPENSE', '6000'),
    cuenta('6310', 'Servicios profesionales', 'OPERATING_EXPENSE', '6100'),
  ]),
)

describe('buildIncomeStatement', () => {
  it('resta el costo de ingresos y los gastos operativos de los ingresos', () => {
    const statement = buildIncomeStatement(
      [
        { accountCode: '4100', debits: 0n, credits: 1_200_000_00n },
        { accountCode: '5110', debits: 30_000_00n, credits: 0n },
        { accountCode: '6310', debits: 200_000_00n, credits: 0n },
      ],
      chart,
      'CRC',
    )

    expect(statement.income.minorUnits).toBe(1_200_000_00n)
    expect(statement.costOfRevenue.minorUnits).toBe(30_000_00n)
    expect(statement.operatingExpenses.minorUnits).toBe(200_000_00n)
    expect(statement.result.minorUnits).toBe(970_000_00n)
  })

  it('un período con más gastos que ingresos da resultado negativo', () => {
    const statement = buildIncomeStatement(
      [{ accountCode: '6310', debits: 10_000_00n, credits: 0n }],
      chart,
      'CRC',
    )

    expect(statement.result.minorUnits).toBe(-10_000_00n)
  })

  it('una agrupadora acumula el saldo de sus hijas', () => {
    const statement = buildIncomeStatement(
      [
        { accountCode: '4100', debits: 0n, credits: 100_00n },
        { accountCode: '4110', debits: 0n, credits: 50_00n },
        { accountCode: '6310', debits: 70_00n, credits: 0n },
      ],
      chart,
      'CRC',
    )

    expect(statement.nodeFor('4000')?.balance.minorUnits).toBe(150_00n)
    expect(statement.nodeFor('6100')?.balance.minorUnits).toBe(70_00n)
  })

  it('las cuentas de balance no aparecen en el estado de resultados', () => {
    const statement = buildIncomeStatement(
      [
        { accountCode: '1101', debits: 500_00n, credits: 0n },
        { accountCode: '4100', debits: 0n, credits: 500_00n },
      ],
      chart,
      'CRC',
    )

    expect(statement.nodeFor('1101')).toBeUndefined()
    expect(statement.result.minorUnits).toBe(500_00n)
  })

  it('un período sin movimientos da resultado cero', () => {
    const statement = buildIncomeStatement([], chart, 'CRC')

    expect(statement.result.isZero()).toBe(true)
    expect(statement.income.isZero()).toBe(true)
  })
})
