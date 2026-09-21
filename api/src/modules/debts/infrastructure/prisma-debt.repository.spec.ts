import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { InterestRate } from '../../../shared/kernel/interest-rate.js'
import { Money } from '../../../shared/kernel/money.js'
import { unwrap } from '../../../shared/kernel/result.js'
import { PrismaService } from '../../../shared/prisma/prisma.service.js'
import { Debt } from '../domain/debt.js'
import { startPostgres, type RunningPostgres } from '../../../test/postgres-container.js'
import { PrismaDebtRepository } from './prisma-debt.repository.js'
import { entrarEnLibroDePrueba } from '../../../shared/libro/libro-de-prueba.js'

const crc = (minorUnits: bigint) => Money.fromMinorUnits(minorUnits, 'CRC')
const utc = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

let postgres: RunningPostgres
let prisma: PrismaService
let repository: PrismaDebtRepository

const conape = () =>
  unwrap(
    Debt.create({
      id: '0199a1c0-0000-7000-8000-000000000001',
      name: 'CONAPE',
      counterparty: 'CONAPE',
      principal: crc(5_634_929_300n),
      rate: unwrap(InterestRate.create('9.500000', 'MONTHLY')),
      termMonths: 120,
      startDate: utc('2026-01-15'),
      kind: 'FRENCH',
      direction: 'BORROWED',
      budgetBucket: 'necesidades',
    }),
  )

const prestamoOtorgado = () =>
  unwrap(
    Debt.create({
      ...conape().toProps(),
      id: '0199a1c0-0000-7000-8000-0000000000aa',
      name: 'Préstamo a Andrés',
      counterparty: 'Andrés',
      direction: 'LENT',
      budgetBucket: null,
    }),
  )

// Los tests de contabilidad no tienen nada que decir sobre libros, pero toda consulta
// necesita uno: sin contexto la extensión de Prisma corta, que es justo lo que queremos.
beforeEach(entrarEnLibroDePrueba)
beforeAll(async () => {
  entrarEnLibroDePrueba()
  postgres = await startPostgres()
  prisma = new PrismaService(postgres.url)
  await prisma.$connect()
  repository = new PrismaDebtRepository(prisma)
}, 180_000)

afterAll(async () => {
  await prisma.$disconnect()
  await postgres.stop()
})

beforeEach(async () => {
  await prisma.debt.deleteMany()
})

describe('PrismaDebtRepository', () => {
  it('guarda y recupera una deuda sin perder precisión en el monto', async () => {
    const debt = conape()
    await repository.save(debt)

    const found = await repository.findById(debt.id)
    expect(found?.principal.minorUnits).toBe(5_634_929_300n)
    expect(found?.principal.currency).toBe('CRC')
  })

  it('conserva la tasa como decimal exacto', async () => {
    await repository.save(conape())
    const found = await repository.findById('0199a1c0-0000-7000-8000-000000000001')
    expect(found?.rate.annualPercentage.toString()).toBe('9.5')
    expect(found?.rate.compounding).toBe('MONTHLY')
  })

  it('devuelve una entidad de dominio, no una fila de Prisma', async () => {
    await repository.save(conape())
    const found = await repository.findById('0199a1c0-0000-7000-8000-000000000001')
    expect(found).toBeInstanceOf(Debt)
    expect(found?.schedule().finalBalance.minorUnits).toBe(0n)
  })

  it('conserva la fecha de inicio como día, sin desplazamiento de zona', async () => {
    await repository.save(conape())
    const found = await repository.findById('0199a1c0-0000-7000-8000-000000000001')
    expect(found?.startDate.toISOString()).toBe('2026-01-15T00:00:00.000Z')
  })

  it('actualiza en lugar de duplicar cuando se guarda dos veces el mismo id', async () => {
    await repository.save(conape())
    await repository.save(conape())
    const page = await repository.findAll(1, 10)
    expect(page.totalItems).toBe(1)
  })

  it('filtra por dirección cuando se le pide', async () => {
    await repository.save(conape())
    await repository.save(prestamoOtorgado())

    const prestados = await repository.findAll(1, 10, 'LENT')
    expect(prestados.totalItems).toBe(1)
    expect(prestados.items[0]?.direction).toBe('LENT')

    const todas = await repository.findAll(1, 10)
    expect(todas.totalItems).toBe(2)
  })

  it('pagina y reporta el total', async () => {
    for (let index = 1; index <= 3; index += 1) {
      await repository.save(
        unwrap(
          Debt.create({
            ...conape().toProps(),
            id: `0199a1c0-0000-7000-8000-00000000000${index}`,
            name: `Deuda ${index}`,
          }),
        ),
      )
    }
    const page = await repository.findAll(2, 2)
    expect(page.items).toHaveLength(1)
    expect(page.totalItems).toBe(3)
  })

  it('guarda un préstamo otorgado sin cubeta y lo recupera como tal', async () => {
    await repository.save(prestamoOtorgado())
    const found = await repository.findById('0199a1c0-0000-7000-8000-0000000000aa')
    expect(found?.direction).toBe('LENT')
    expect(found?.budgetBucket).toBeNull()
    expect(found?.isLent()).toBe(true)
  })

  it('devuelve null para un id inexistente y false al borrarlo', async () => {
    expect(await repository.findById('0199a1c0-0000-7000-8000-00000000ffff')).toBeNull()
    expect(await repository.delete('0199a1c0-0000-7000-8000-00000000ffff')).toBe(false)
  })

  it('borra una deuda existente', async () => {
    const debt = conape()
    await repository.save(debt)
    expect(await repository.delete(debt.id)).toBe(true)
    expect(await repository.findById(debt.id)).toBeNull()
  })
})
