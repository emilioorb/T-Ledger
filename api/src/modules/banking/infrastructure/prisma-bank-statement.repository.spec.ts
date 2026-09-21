import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { DateRange } from '../../../shared/kernel/date-range.js'
import { Money } from '../../../shared/kernel/money.js'
import { unwrap } from '../../../shared/kernel/result.js'
import { PrismaService } from '../../../shared/prisma/prisma.service.js'
import { startPostgres, type RunningPostgres } from '../../../test/postgres-container.js'
import type { ParsedLine } from '../domain/bank-line.js'
import type { StatementHeader } from '../domain/bank-statement-repository.port.js'
import { PrismaBankStatementRepository } from './prisma-bank-statement.repository.js'

let postgres: RunningPostgres
let prisma: PrismaService
let repository: PrismaBankStatementRepository

const CUENTA = '01931b4e-0000-7000-8000-000000000001'
const OTRA_CUENTA = '01931b4e-0000-7000-8000-000000000002'

const crc = (minorUnits: bigint) => Money.fromMinorUnits(minorUnits, 'CRC')
const utc = (iso: string) => new Date(`${iso}T00:00:00.000Z`)
const septiembre = unwrap(DateRange.create(utc('2026-09-01'), utc('2026-09-30')))

const linea = (reference: string, date = '2026-09-15'): ParsedLine => ({
  date: utc(date),
  description: 'SUPERMERCADO',
  reference,
  amount: crc(-45_000_00n),
})

const extracto = (bankAccountId = CUENTA): StatementHeader => ({
  id: randomUUID(),
  bankAccountId,
  fileName: 'extracto.csv',
})

beforeAll(async () => {
  postgres = await startPostgres()
  prisma = new PrismaService(postgres.url)
  await prisma.$connect()
  repository = new PrismaBankStatementRepository(prisma)
}, 180_000)

afterAll(async () => {
  await prisma.$disconnect()
  await postgres.stop()
})

beforeEach(async () => {
  await prisma.bankLine.deleteMany()
  await prisma.bankStatement.deleteMany()
  await prisma.bankAccount.deleteMany()

  const cuentas: { id: string; name: string }[] = [
    { id: CUENTA, name: 'BAC colones' },
    { id: OTRA_CUENTA, name: 'BN colones' },
  ]
  for (const cuenta of cuentas) {
    await prisma.bankAccount.create({
      data: { ...cuenta, accountCode: '1111', currency: 'CRC' },
    })
  }
})

describe('PrismaBankStatementRepository', () => {
  it('guarda las líneas del extracto y devuelve cuántas entraron', async () => {
    const result = await repository.save(extracto(), [linea('REF1'), linea('REF2')])

    expect(result).toEqual({ imported: 2, duplicated: 0 })
    expect(await prisma.bankLine.count()).toBe(2)
  })

  it('reimportar el mismo archivo no duplica ninguna línea', async () => {
    await repository.save(extracto(), [linea('REF1'), linea('REF2')])
    const segunda = await repository.save(extracto(), [linea('REF1'), linea('REF2')])

    expect(segunda).toEqual({ imported: 0, duplicated: 2 })
    expect(await prisma.bankLine.count()).toBe(2)
  })

  it('la misma línea repetida dentro del mismo archivo entra una sola vez', async () => {
    const result = await repository.save(extracto(), [linea('REF1'), linea('REF1')])

    expect(result).toEqual({ imported: 1, duplicated: 1 })
  })

  it('dos extractos que se solapan solo suman lo nuevo', async () => {
    await repository.save(extracto(), [linea('REF1')])
    const segunda = await repository.save(extracto(), [linea('REF1'), linea('REF2')])

    expect(segunda).toEqual({ imported: 1, duplicated: 1 })
  })

  it('la misma línea en otra cuenta bancaria sí entra', async () => {
    await repository.save(extracto(), [linea('REF1')])
    const otra = await repository.save(extracto(OTRA_CUENTA), [linea('REF1')])

    expect(otra.imported).toBe(1)
  })

  it('el extracto guarda cuántas entraron y cuántas se descartaron', async () => {
    const header = extracto()
    await repository.save(header, [linea('REF1'), linea('REF1')])

    const row = await prisma.bankStatement.findUnique({ where: { id: header.id } })
    expect(row?.lineCount).toBe(1)
    expect(row?.duplicateCount).toBe(1)
  })

  it('trae solo las líneas pendientes del rango, paginadas', async () => {
    await repository.save(extracto(), [
      linea('REF1', '2026-09-05'),
      linea('REF2', '2026-10-05'),
    ])

    const pendientes = await repository.pendingLines(CUENTA, septiembre, 1, 20)

    expect(pendientes.items.map((line) => line.reference)).toEqual(['REF1'])
    expect(pendientes.totalItems).toBe(1)
  })

  it('una línea conciliada deja de estar pendiente', async () => {
    await repository.save(extracto(), [linea('REF1', '2026-09-05')])
    const [pendiente] = (await repository.pendingLines(CUENTA, septiembre, 1, 20)).items

    await repository.markMatched(pendiente!.id, 'mov-1')

    expect((await repository.pendingLines(CUENTA, septiembre, 1, 20)).totalItems).toBe(0)
    expect(await repository.isMovementTaken('mov-1')).toBe(true)
  })

  it('deshacer devuelve la línea a pendiente y libera el movimiento', async () => {
    await repository.save(extracto(), [linea('REF1', '2026-09-05')])
    const [pendiente] = (await repository.pendingLines(CUENTA, septiembre, 1, 20)).items
    await repository.markMatched(pendiente!.id, 'mov-1')

    await repository.markPending(pendiente!.id)

    expect((await repository.pendingLines(CUENTA, septiembre, 1, 20)).totalItems).toBe(1)
    expect(await repository.isMovementTaken('mov-1')).toBe(false)
  })
})
