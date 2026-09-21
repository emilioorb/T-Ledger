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
      receiptUrl: null,
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
  const accounts = new PrismaAccountRepository(prisma)
  journal = new PrismaJournalRepository(prisma, accounts)
  repository = new PrismaMovementRepository(prisma)
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
