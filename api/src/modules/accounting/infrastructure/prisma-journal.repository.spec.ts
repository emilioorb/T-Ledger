import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { Money } from '../../../shared/kernel/money.js'
import { unwrap } from '../../../shared/kernel/result.js'
import { PrismaService } from '../../../shared/prisma/prisma.service.js'
import { startPostgres, type RunningPostgres } from '../../../test/postgres-container.js'
import { PeriodKey } from '../domain/accounting-period.js'
import { Account } from '../domain/account.js'
import { ChartOfAccounts } from '../domain/chart-of-accounts.js'
import { JournalEntry, type JournalLine } from '../domain/journal-entry.js'
import { CHART_SEED } from './chart-seed.js'
import { PrismaAccountRepository } from './prisma-account.repository.js'
import { PrismaJournalRepository } from './prisma-journal.repository.js'

const crc = (minorUnits: bigint) => Money.fromMinorUnits(minorUnits, 'CRC')
const usd = (minorUnits: bigint) => Money.fromMinorUnits(minorUnits, 'USD')
const utc = (iso: string) => new Date(`${iso}T00:00:00.000Z`)
const septiembre = unwrap(PeriodKey.of(2026, 9)).range()

let postgres: RunningPostgres
let prisma: PrismaService
let accounts: PrismaAccountRepository
let repository: PrismaJournalRepository
let chart: ChartOfAccounts

const asiento = (id: string, date: Date, lines: JournalLine[]) =>
  unwrap(
    JournalEntry.create(
      { id, date, description: 'Prueba', reference: null, lines, sourceMovementId: null, reversesEntryId: null },
      chart,
    ),
  )

const asientoDeGasto = (id: string, date: Date, minor: bigint) =>
  asiento(id, date, [
    { accountCode: '6100', amount: crc(minor), side: 'DEBIT' },
    { accountCode: '1101', amount: crc(minor), side: 'CREDIT' },
  ])

const asientoEnDolares = (id: string, date: Date, minor: bigint) =>
  asiento(id, date, [
    { accountCode: '6100', amount: usd(minor), side: 'DEBIT' },
    { accountCode: '1102', amount: usd(minor), side: 'CREDIT' },
  ])

// La cuenta puente tocada dos veces en el mismo asiento, en dos monedas.
const asientoDeConversion = (id: string, date: Date) =>
  asiento(id, date, [
    { accountCode: '1190', amount: crc(508_000_00n), side: 'DEBIT' },
    { accountCode: '1101', amount: crc(508_000_00n), side: 'CREDIT' },
    { accountCode: '1102', amount: usd(1_000_00n), side: 'DEBIT' },
    { accountCode: '1190', amount: usd(1_000_00n), side: 'CREDIT' },
  ])

beforeAll(async () => {
  postgres = await startPostgres()
  prisma = new PrismaService(postgres.url)
  await prisma.$connect()
  accounts = new PrismaAccountRepository(prisma)
  repository = new PrismaJournalRepository(prisma, accounts)
  await accounts.saveMany(CHART_SEED.map((props) => unwrap(Account.create(props))))
  chart = await accounts.loadChart()
}, 180_000)

afterAll(async () => {
  await prisma.$disconnect()
  await postgres.stop()
})

beforeEach(async () => {
  await prisma.journalLine.deleteMany()
  await prisma.journalEntry.deleteMany()
})

describe('PrismaJournalRepository', () => {
  it('guarda un asiento con sus líneas y lo recupera como agregado', async () => {
    await repository.save(asientoDeGasto('a1', utc('2026-09-16'), 20_000_00n))
    const found = await repository.findById('a1')

    expect(found?.lines).toHaveLength(2)
    expect(found?.totalFor('CRC', 'DEBIT').minorUnits).toBe(20_000_00n)
  })

  it('agrega totales por cuenta en la base, acotado a una moneda', async () => {
    await repository.save(asientoDeGasto('a1', utc('2026-09-16'), 20_000_00n))
    await repository.save(asientoDeGasto('a2', utc('2026-09-17'), 5_000_00n))

    const totals = await repository.totalsByAccount('CRC', septiembre)
    const gasto = totals.find((t) => t.accountCode === '6100')

    expect(gasto?.debits).toBe(25_000_00n)
    expect(gasto?.credits).toBe(0n)
  })

  it('no mezcla monedas en la agregación', async () => {
    await repository.save(asientoDeGasto('a1', utc('2026-09-16'), 20_000_00n))
    await repository.save(asientoEnDolares('a2', utc('2026-09-16'), 100_00n))

    const enColones = await repository.totalsByAccount('CRC', septiembre)
    const enDolares = await repository.totalsByAccount('USD', septiembre)

    expect(enColones.find((t) => t.accountCode === '6100')?.debits).toBe(20_000_00n)
    expect(enDolares.find((t) => t.accountCode === '6100')?.debits).toBe(100_00n)
  })

  it('el rango del período excluye lo anterior y lo posterior', async () => {
    await repository.save(asientoDeGasto('a0', utc('2026-08-31'), 1_000_00n))
    await repository.save(asientoDeGasto('a1', utc('2026-09-01'), 2_000_00n))
    await repository.save(asientoDeGasto('a2', utc('2026-09-30'), 3_000_00n))
    await repository.save(asientoDeGasto('a3', utc('2026-10-01'), 4_000_00n))

    const totals = await repository.totalsByAccount('CRC', septiembre)

    expect(totals.find((t) => t.accountCode === '6100')?.debits).toBe(5_000_00n)
  })

  it('el saldo inicial acumula todo lo anterior a la fecha', async () => {
    await repository.save(asientoDeGasto('a0', utc('2026-08-31'), 1_000_00n))
    await repository.save(asientoDeGasto('a1', utc('2026-09-15'), 2_000_00n))

    const opening = await repository.openingBalanceFor('6100', 'CRC', utc('2026-09-01'))

    expect(opening.debits).toBe(1_000_00n)
  })

  it('una cuenta que tocó dos monedas en el mismo asiento se agrega por separado', async () => {
    await repository.save(asientoDeConversion('a1', utc('2026-09-16')))

    const enColones = await repository.totalsByAccount('CRC', septiembre)
    const enDolares = await repository.totalsByAccount('USD', septiembre)

    expect(enColones.find((t) => t.accountCode === '1190')?.debits).toBe(508_000_00n)
    expect(enColones.find((t) => t.accountCode === '1190')?.credits).toBe(0n)
    expect(enDolares.find((t) => t.accountCode === '1190')?.credits).toBe(1_000_00n)
    expect(enDolares.find((t) => t.accountCode === '1190')?.debits).toBe(0n)
  })

  it('el mayor trae solo los asientos que tocan esa cuenta en esa moneda', async () => {
    await repository.save(asientoDeGasto('a1', utc('2026-09-16'), 20_000_00n))
    await repository.save(asientoEnDolares('a2', utc('2026-09-17'), 100_00n))

    const mayor = await repository.ledgerFor('1101', 'CRC', septiembre)

    expect(mayor.map((e) => e.id)).toEqual(['a1'])
  })

  it('agrega por cuenta y por día, para poder valuar cada día a su propia tasa', async () => {
    await repository.save(asientoDeGasto('a1', utc('2026-09-16'), 20_000_00n))
    await repository.save(asientoDeGasto('a2', utc('2026-09-16'), 5_000_00n))
    await repository.save(asientoDeGasto('a3', utc('2026-09-17'), 30_000_00n))
    await repository.save(asientoEnDolares('a4', utc('2026-09-17'), 100_00n))

    const porDia = await repository.totalsByAccountPerDay('CRC', utc('2026-09-30'))
    const gastos = porDia
      .filter((total) => total.accountCode === '6100')
      .sort((a, b) => a.date.getTime() - b.date.getTime())

    expect(gastos).toHaveLength(2)
    expect(gastos[0]?.date.toISOString().slice(0, 10)).toBe('2026-09-16')
    expect(gastos[0]?.debits).toBe(25_000_00n)
    expect(gastos[1]?.date.toISOString().slice(0, 10)).toBe('2026-09-17')
    expect(gastos[1]?.debits).toBe(30_000_00n)
    // El asiento en dólares del 17 no entra en la agregación de colones.
    expect(gastos.reduce((acc, total) => acc + total.debits, 0n)).toBe(55_000_00n)
  })

  it('la agregación diaria excluye lo posterior a la fecha de corte', async () => {
    await repository.save(asientoDeGasto('a1', utc('2026-09-16'), 20_000_00n))
    await repository.save(asientoDeGasto('a2', utc('2026-10-02'), 99_000_00n))

    const porDia = await repository.totalsByAccountPerDay('CRC', utc('2026-09-30'))

    expect(porDia.every((total) => total.date <= utc('2026-09-30'))).toBe(true)
    expect(porDia.filter((total) => total.accountCode === '6100')).toHaveLength(1)
  })

  it('guardar dos veces el mismo asiento no duplica sus líneas', async () => {
    await repository.save(asientoDeGasto('a1', utc('2026-09-16'), 20_000_00n))
    await repository.save(asientoDeGasto('a1', utc('2026-09-16'), 20_000_00n))

    expect(await prisma.journalLine.count()).toBe(2)
  })
})
