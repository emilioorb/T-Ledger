import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { Money } from '../../../shared/kernel/money.js'
import { unwrap } from '../../../shared/kernel/result.js'
import { PrismaService } from '../../../shared/prisma/prisma.service.js'
import { startPostgres, type RunningPostgres } from '../../../test/postgres-container.js'
import { PeriodKey } from '../domain/accounting-period.js'
import { Account } from '../domain/account.js'
import type { ChartOfAccounts } from '../domain/chart-of-accounts.js'
import { JournalEntry } from '../domain/journal-entry.js'
import { Movement } from '../domain/movement.js'
import { CHART_SEED } from './chart-seed.js'
import { PrismaAccountRepository } from './prisma-account.repository.js'
import { PrismaJournalRepository } from './prisma-journal.repository.js'
import { PrismaMovementRepository } from './prisma-movement.repository.js'
import { entrarEnLibroDePrueba } from '../../../shared/libro/libro-de-prueba.js'
import { enTransaccion } from '../../../test/en-transaccion.js'

const crc = (minorUnits: bigint) => Money.fromMinorUnits(minorUnits, 'CRC')
const utc = (iso: string) => new Date(`${iso}T00:00:00.000Z`)
const septiembre = unwrap(PeriodKey.of(2026, 9)).range()

let postgres: RunningPostgres
let prisma: PrismaService
let repository: PrismaMovementRepository
let journal: PrismaJournalRepository
let chart: ChartOfAccounts

const movimiento = (id: string, date: Date, status: 'ACTIVE' | 'VOIDED' = 'ACTIVE') =>
  unwrap(
    Movement.create({
      id,
      date,
      kind: 'EXPENSE',
      categoryId: 'cat-1',
      counterparty: 'Proveedor',
      amount: crc(20_000_00n),
      paymentAccountCode: '1101',
      receiptKey: null,
      status,
    }),
  )

const gasto = (
  id: string,
  categoryId: string,
  minorUnits: bigint,
  status: 'ACTIVE' | 'VOIDED' = 'ACTIVE',
) =>
  unwrap(
    Movement.create({
      id,
      date: utc('2026-09-15'),
      kind: 'EXPENSE',
      categoryId,
      counterparty: 'Proveedor',
      amount: crc(minorUnits),
      paymentAccountCode: '1101',
      receiptKey: null,
      status,
    }),
  )

const asientoDe = (movementId: string, date: Date) =>
  unwrap(
    JournalEntry.create(
      {
        id: `e-${movementId}`,
        date,
        description: 'Gasto',
        reference: null,
        lines: [
          { accountCode: '6100', amount: crc(20_000_00n), side: 'DEBIT' },
          { accountCode: '1101', amount: crc(20_000_00n), side: 'CREDIT' },
        ],
        sourceMovementId: movementId,
        reversesEntryId: null,
      },
      chart,
    ),
  )

// Este test no tiene nada que decir sobre libros, pero toda consulta necesita uno:
// sin contexto la extensión de Prisma corta, que es exactamente lo que queremos.
beforeEach(entrarEnLibroDePrueba)

beforeAll(async () => {
  entrarEnLibroDePrueba()
  postgres = await startPostgres()
  prisma = new PrismaService(postgres.url)
  await prisma.$connect()
  const accounts = enTransaccion(prisma, new PrismaAccountRepository(prisma))
  journal = enTransaccion(prisma, new PrismaJournalRepository(prisma, accounts))
  repository = enTransaccion(prisma, new PrismaMovementRepository(prisma))
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
  await prisma.movement.deleteMany()
})

describe('PrismaMovementRepository', () => {
  it('cuenta los movimientos activos del mes que no generaron asiento', async () => {
    await repository.save(movimiento('m1', utc('2026-09-03')))
    await repository.save(movimiento('m2', utc('2026-09-10')))
    await journal.save(asientoDe('m1', utc('2026-09-03')))

    expect(await repository.countUnposted(septiembre)).toBe(1)
  })

  it('un movimiento anulado sin asiento no bloquea el cierre', async () => {
    await repository.save(movimiento('m1', utc('2026-09-03'), 'VOIDED'))

    expect(await repository.countUnposted(septiembre)).toBe(0)
  })

  it('no mira fuera del rango pedido', async () => {
    await repository.save(movimiento('m1', utc('2026-08-31')))
    await repository.save(movimiento('m2', utc('2026-10-01')))

    expect(await repository.countUnposted(septiembre)).toBe(0)
  })

  it('un mes sin movimientos no tiene nada que contar', async () => {
    expect(await repository.countUnposted(septiembre)).toBe(0)
  })

  // La barra de composición de la pantalla de movimientos se dibuja con esto. Si sumara la
  // página en vez del filtro, diría porcentajes falsos sobre el conjunto entero y nadie
  // tendría cómo notarlo.
  it('suma por categoría todo lo que cumple el filtro, no solo una página', async () => {
    await repository.save(gasto('m1', 'cat-1', 10_000_00n))
    await repository.save(gasto('m2', 'cat-1', 5_000_00n))
    await repository.save(gasto('m3', 'cat-2', 7_000_00n))

    const totals = await repository.totalsByCategory({ range: septiembre })

    expect(totals).toEqual(
      expect.arrayContaining([
        { categoryId: 'cat-1', total: crc(15_000_00n) },
        { categoryId: 'cat-2', total: crc(7_000_00n) },
      ]),
    )
    expect(totals).toHaveLength(2)
  })

  it('un anulado no suma aunque el filtro pida todos los estados', async () => {
    await repository.save(gasto('m1', 'cat-1', 10_000_00n))
    await repository.save(gasto('m2', 'cat-1', 90_000_00n, 'VOIDED'))

    expect(await repository.totalsByCategory({})).toEqual([
      { categoryId: 'cat-1', total: crc(10_000_00n) },
    ])
  })

  // La barra vive arriba de la tabla: si resume activos mientras la tabla lista anulados,
  // habla de filas que no están. Sin barra es mejor que con una que miente.
  it('pedir la composición de los anulados no devuelve la de los activos', async () => {
    await repository.save(gasto('m1', 'cat-1', 10_000_00n))
    await repository.save(gasto('m2', 'cat-1', 90_000_00n, 'VOIDED'))

    expect(await repository.totalsByCategory({ status: 'VOIDED' })).toEqual([])
  })

  // Una barra apilada reparte un total entre partes. El salario no es una parte del gasto:
  // metido en la misma barra se come el setenta por ciento y esconde lo que se venía a ver.
  it('sin filtro de tipo compone el gasto, no el ingreso', async () => {
    await repository.save(gasto('m1', 'cat-1', 10_000_00n))
    await repository.save(
      unwrap(
        Movement.create({
          id: 'm2',
          date: utc('2026-09-15'),
          kind: 'INCOME',
          categoryId: 'cat-salario',
          counterparty: 'Empresa',
          amount: crc(1_450_000_00n),
          paymentAccountCode: '1101',
          receiptKey: null,
          status: 'ACTIVE',
        }),
      ),
    )

    expect(await repository.totalsByCategory({})).toEqual([
      { categoryId: 'cat-1', total: crc(10_000_00n) },
    ])
    expect(await repository.totalsByCategory({ kind: 'INCOME' })).toEqual([
      { categoryId: 'cat-salario', total: crc(1_450_000_00n) },
    ])
  })

  it('respeta el filtro de categoría y el rango de fechas', async () => {
    await repository.save(gasto('m1', 'cat-1', 10_000_00n))
    await repository.save(gasto('m2', 'cat-2', 90_000_00n))

    expect(await repository.totalsByCategory({ categoryId: 'cat-1' })).toEqual([
      { categoryId: 'cat-1', total: crc(10_000_00n) },
    ])
    expect(
      await repository.totalsByCategory({ range: unwrap(PeriodKey.of(2026, 8)).range() }),
    ).toEqual([])
  })

  it('separa las monedas: sumar colones con dólares daría un número que no existe', async () => {
    await repository.save(gasto('m1', 'cat-1', 10_000_00n))
    await repository.save(
      unwrap(
        Movement.create({
          id: 'm2',
          date: utc('2026-09-15'),
          kind: 'EXPENSE',
          categoryId: 'cat-1',
          counterparty: 'Proveedor',
          amount: Money.fromMinorUnits(50_00n, 'USD'),
          paymentAccountCode: '1101',
          receiptKey: null,
          status: 'ACTIVE',
        }),
      ),
    )

    const totals = await repository.totalsByCategory({})

    expect(totals).toHaveLength(2)
    expect(totals.map((total) => total.total.currency).sort()).toEqual(['CRC', 'USD'])
  })

  it('lista los meses con movimientos sin repetirlos', async () => {
    await repository.save(movimiento('m1', utc('2026-08-31')))
    await repository.save(movimiento('m2', utc('2026-09-03')))
    await repository.save(movimiento('m3', utc('2026-09-10')))

    const months = await repository.monthsWithMovements()

    expect(months.map((key) => key.toString())).toEqual(['2026-08', '2026-09'])
  })
})

describe('PrismaJournalRepository · meses con asientos', () => {
  it('lista un mes por cada mes con asientos, sin repetirlos', async () => {
    await repository.save(movimiento('m1', utc('2026-09-03')))
    await journal.save(asientoDe('m1', utc('2026-09-03')))
    await journal.save(asientoDe('m2', utc('2026-09-20')))
    await journal.save(asientoDe('m3', utc('2026-10-02')))

    const months = await journal.monthsWithEntries()

    expect(months.map((key) => key.toString())).toEqual(['2026-09', '2026-10'])
  })
})
