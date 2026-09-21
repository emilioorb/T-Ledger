import { describe, expect, it } from 'vitest'
import { Money } from '../../../shared/kernel/money.js'
import { isErr, unwrap } from '../../../shared/kernel/result.js'
import { Account } from './account.js'
import { ChartOfAccounts } from './chart-of-accounts.js'
import { JournalEntry, type JournalLine } from './journal-entry.js'

const crc = (minorUnits: bigint) => Money.fromMinorUnits(minorUnits, 'CRC')
const usd = (minorUnits: bigint) => Money.fromMinorUnits(minorUnits, 'USD')
const utc = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

const cuenta = (
  code: string,
  name: string,
  accountClass: 'ASSET' | 'OPERATING_EXPENSE',
  parentCode: string | null,
  active = true,
) => unwrap(Account.create({ code, name, accountClass, parentCode, active, sortOrder: 0 }))

const chart = unwrap(
  ChartOfAccounts.create([
    cuenta('1000', 'Activos', 'ASSET', null),
    cuenta('1100', 'Efectivo', 'ASSET', '1000'),
    cuenta('1101', 'Caja colones', 'ASSET', '1100'),
    cuenta('1102', 'Caja dólares', 'ASSET', '1100'),
    cuenta('1190', 'Traslados entre monedas', 'ASSET', '1100'),
    cuenta('1199', 'Cuenta cerrada', 'ASSET', '1100', false),
    cuenta('6000', 'Gastos operativos', 'OPERATING_EXPENSE', null),
    cuenta('6310', 'Servicios profesionales', 'OPERATING_EXPENSE', '6000'),
  ]),
)

const entry = (lines: JournalLine[], id = 'a1') =>
  JournalEntry.create(
    {
      id,
      date: utc('2026-09-16'),
      description: 'Asiento de prueba',
      reference: null,
      lines,
      sourceMovementId: null,
      reversesEntryId: null,
    },
    chart,
  )

describe('JournalEntry', () => {
  it('acepta un asiento que cuadra en una moneda', () => {
    const result = entry([
      { accountCode: '6310', amount: crc(20_000_00n), side: 'DEBIT' },
      { accountCode: '1101', amount: crc(20_000_00n), side: 'CREDIT' },
    ])

    expect(isErr(result)).toBe(false)
  })

  it('rechaza un asiento descuadrado', () => {
    const result = entry([
      { accountCode: '6310', amount: crc(20_000_00n), side: 'DEBIT' },
      { accountCode: '1101', amount: crc(19_000_00n), side: 'CREDIT' },
    ])

    expect(isErr(result)).toBe(true)
  })

  it('acepta un asiento multimoneda que cuadra en cada moneda por separado', () => {
    // Conversión: salen colones contra la cuenta puente, entran dólares contra la misma.
    const result = entry([
      { accountCode: '1190', amount: crc(508_000_00n), side: 'DEBIT' },
      { accountCode: '1101', amount: crc(508_000_00n), side: 'CREDIT' },
      { accountCode: '1102', amount: usd(1_000_00n), side: 'DEBIT' },
      { accountCode: '1190', amount: usd(1_000_00n), side: 'CREDIT' },
    ])

    expect(isErr(result)).toBe(false)
  })

  it('rechaza un asiento que cuadra en total pero no en cada moneda', () => {
    const result = entry([
      { accountCode: '6310', amount: crc(1_000_00n), side: 'DEBIT' },
      { accountCode: '1102', amount: usd(1_000_00n), side: 'CREDIT' },
    ])

    expect(isErr(result)).toBe(true)
  })

  it('rechaza un asiento con menos de dos líneas', () => {
    expect(isErr(entry([{ accountCode: '1101', amount: crc(100n), side: 'DEBIT' }]))).toBe(true)
    expect(isErr(entry([]))).toBe(true)
  })

  it('rechaza un asiento contra una cuenta agrupadora', () => {
    const result = entry([
      { accountCode: '1100', amount: crc(100n), side: 'DEBIT' },
      { accountCode: '1101', amount: crc(100n), side: 'CREDIT' },
    ])

    expect(isErr(result)).toBe(true)
  })

  it('rechaza un asiento contra una cuenta inactiva', () => {
    const result = entry([
      { accountCode: '1199', amount: crc(100n), side: 'DEBIT' },
      { accountCode: '1101', amount: crc(100n), side: 'CREDIT' },
    ])

    expect(isErr(result)).toBe(true)
  })

  it('rechaza un asiento contra una cuenta que no existe', () => {
    const result = entry([
      { accountCode: '9999', amount: crc(100n), side: 'DEBIT' },
      { accountCode: '1101', amount: crc(100n), side: 'CREDIT' },
    ])

    expect(isErr(result)).toBe(true)
  })

  it('rechaza una línea de monto cero o negativo', () => {
    expect(
      isErr(
        entry([
          { accountCode: '6310', amount: crc(0n), side: 'DEBIT' },
          { accountCode: '1101', amount: crc(0n), side: 'CREDIT' },
        ]),
      ),
    ).toBe(true)
    expect(
      isErr(
        entry([
          { accountCode: '6310', amount: crc(-100n), side: 'DEBIT' },
          { accountCode: '1101', amount: crc(-100n), side: 'CREDIT' },
        ]),
      ),
    ).toBe(true)
  })

  it('rechaza una descripción vacía', () => {
    const result = JournalEntry.create(
      {
        id: 'a2',
        date: utc('2026-09-16'),
        description: '   ',
        reference: null,
        lines: [
          { accountCode: '6310', amount: crc(100n), side: 'DEBIT' },
          { accountCode: '1101', amount: crc(100n), side: 'CREDIT' },
        ],
        sourceMovementId: null,
        reversesEntryId: null,
      },
      chart,
    )

    expect(isErr(result)).toBe(true)
  })

  it('reporta las monedas presentes y los totales por lado', () => {
    const asiento = unwrap(
      entry([
        { accountCode: '1190', amount: crc(508_000_00n), side: 'DEBIT' },
        { accountCode: '1101', amount: crc(508_000_00n), side: 'CREDIT' },
        { accountCode: '1102', amount: usd(1_000_00n), side: 'DEBIT' },
        { accountCode: '1190', amount: usd(1_000_00n), side: 'CREDIT' },
      ]),
    )

    expect(asiento.currencies()).toEqual(['CRC', 'USD'])
    expect(asiento.totalFor('CRC', 'DEBIT').minorUnits).toBe(508_000_00n)
    expect(asiento.totalFor('USD', 'CREDIT').minorUnits).toBe(1_000_00n)
  })

  it('la reversión invierte cada lado y apunta al asiento original', () => {
    const original = unwrap(
      entry([
        { accountCode: '6310', amount: crc(20_000_00n), side: 'DEBIT' },
        { accountCode: '1101', amount: crc(20_000_00n), side: 'CREDIT' },
      ]),
    )

    const reversa = original.reverse('a1-rev', utc('2026-09-20'))

    expect(reversa.reversesEntryId).toBe('a1')
    expect(reversa.date.toISOString()).toBe('2026-09-20T00:00:00.000Z')
    expect(reversa.lines.map((l) => [l.accountCode, l.side])).toEqual([
      ['6310', 'CREDIT'],
      ['1101', 'DEBIT'],
    ])
  })

  it('la reversión de una reversión vuelve al asiento original', () => {
    const original = unwrap(
      entry([
        { accountCode: '6310', amount: crc(20_000_00n), side: 'DEBIT' },
        { accountCode: '1101', amount: crc(20_000_00n), side: 'CREDIT' },
      ]),
    )

    const doble = original.reverse('rev', utc('2026-09-20')).reverse('rev2', utc('2026-09-21'))

    expect(doble.lines.map((l) => l.side)).toEqual(['DEBIT', 'CREDIT'])
  })
})
