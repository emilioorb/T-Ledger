import { describe, expect, it } from 'vitest'
import { Money } from '../../../../shared/kernel/money.js'
import { unwrap } from '../../../../shared/kernel/result.js'
import type { AccountClass } from '../account-class.js'
import { Account } from '../account.js'
import { ChartOfAccounts } from '../chart-of-accounts.js'
import { JournalEntry, type JournalLine } from '../journal-entry.js'
import { buildLedger } from './general-ledger.js'

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
    cuenta('1102', 'Caja dólares', 'ASSET', '1000'),
    cuenta('2000', 'Pasivos', 'LIABILITY', null),
    cuenta('2110', 'Tarjeta de crédito', 'LIABILITY', '2000'),
    cuenta('6000', 'Gastos operativos', 'OPERATING_EXPENSE', null),
    cuenta('6310', 'Servicios profesionales', 'OPERATING_EXPENSE', '6000'),
  ]),
)

const crc = (minorUnits: bigint) => Money.fromMinorUnits(minorUnits, 'CRC')

const linea = (accountCode: string, amount: Money, side: JournalLine['side']): JournalLine => ({
  accountCode,
  amount,
  side,
})

const asiento = (id: string, day: number, description: string, lines: readonly JournalLine[]) =>
  unwrap(
    JournalEntry.create(
      {
        id,
        date: new Date(Date.UTC(2026, 8, day)),
        description,
        reference: null,
        lines,
        sourceMovementId: null,
        reversesEntryId: null,
      },
      chart,
    ),
  )

const gasto = (id: string, day: number, monto: bigint) =>
  asiento(id, day, `Gasto ${id}`, [
    linea('6310', crc(monto), 'DEBIT'),
    linea('1101', crc(monto), 'CREDIT'),
  ])

describe('buildLedger', () => {
  it('arranca del saldo inicial y acumula fila por fila', () => {
    const ledger = buildLedger(
      { debits: 100_000_00n, credits: 0n },
      [gasto('a1', 3, 20_000_00n), gasto('a2', 7, 5_000_00n)],
      '1101',
      'CRC',
      'ASSET',
    )

    expect(ledger.openingBalance.minorUnits).toBe(100_000_00n)
    expect(ledger.rows.map((r) => r.runningBalance.minorUnits)).toEqual([80_000_00n, 75_000_00n])
    expect(ledger.closingBalance.minorUnits).toBe(75_000_00n)
  })

  it('cada fila lleva su débito o su crédito, no los dos', () => {
    const ledger = buildLedger(
      { debits: 0n, credits: 0n },
      [gasto('a1', 3, 20_000_00n)],
      '6310',
      'CRC',
      'OPERATING_EXPENSE',
    )

    const [row] = ledger.rows
    expect(row?.entryId).toBe('a1')
    expect(row?.description).toBe('Gasto a1')
    expect(row?.debit.minorUnits).toBe(20_000_00n)
    expect(row?.credit.isZero()).toBe(true)
  })

  it('el saldo corrido usa el signo del saldo normal de la cuenta', () => {
    const compra = asiento('a1', 4, 'Compra con tarjeta', [
      linea('6310', crc(30_000_00n), 'DEBIT'),
      linea('2110', crc(30_000_00n), 'CREDIT'),
    ])

    const ledger = buildLedger({ debits: 0n, credits: 0n }, [compra], '2110', 'CRC', 'LIABILITY')

    expect(ledger.closingBalance.minorUnits).toBe(30_000_00n)
  })

  it('deja fuera las líneas de otras cuentas y de otras monedas', () => {
    const conversion = asiento('a1', 5, 'Conversión', [
      linea('1101', crc(50_000_00n), 'CREDIT'),
      linea('1102', crc(50_000_00n), 'DEBIT'),
      linea('1102', Money.fromMinorUnits(90_00n, 'USD'), 'CREDIT'),
      linea('1101', Money.fromMinorUnits(90_00n, 'USD'), 'DEBIT'),
    ])

    const ledger = buildLedger({ debits: 0n, credits: 0n }, [conversion], '1102', 'CRC', 'ASSET')

    expect(ledger.rows).toHaveLength(1)
    expect(ledger.rows[0]?.debit.minorUnits).toBe(50_000_00n)
  })

  it('ordena las filas por fecha aunque lleguen desordenadas', () => {
    const ledger = buildLedger(
      { debits: 0n, credits: 0n },
      [gasto('a2', 9, 1_00n), gasto('a1', 2, 2_00n)],
      '6310',
      'CRC',
      'OPERATING_EXPENSE',
    )

    expect(ledger.rows.map((r) => r.entryId)).toEqual(['a1', 'a2'])
  })

  it('una cuenta sin movimiento en el período cierra donde abrió', () => {
    const ledger = buildLedger(
      { debits: 80_000_00n, credits: 5_000_00n },
      [],
      '1101',
      'CRC',
      'ASSET',
    )

    expect(ledger.rows).toEqual([])
    expect(ledger.closingBalance.minorUnits).toBe(75_000_00n)
  })
})
