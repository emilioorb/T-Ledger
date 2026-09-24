import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { unwrap } from '../../../shared/kernel/result.js'
import { PrismaService } from '../../../shared/prisma/prisma.service.js'
import { startPostgres, type RunningPostgres } from '../../../test/postgres-container.js'
import { Account } from '../domain/account.js'
import { SeedChartUseCase } from '../application/seed-chart.use-case.js'
import { CHART_SEED } from './chart-seed.js'
import { PrismaAccountRepository } from './prisma-account.repository.js'
import { LIBRO_DE_PRUEBA } from '../../../shared/libro/libro-de-prueba.js'
import { entrarEnLibroDePrueba } from '../../../shared/libro/libro-de-prueba.js'
import { enTransaccion } from '../../../test/en-transaccion.js'

let postgres: RunningPostgres
let prisma: PrismaService
let repository: PrismaAccountRepository

// Este test no tiene nada que decir sobre libros, pero toda consulta necesita uno:
// sin contexto la extensión de Prisma corta, que es exactamente lo que queremos.
beforeEach(entrarEnLibroDePrueba)

beforeAll(async () => {
  entrarEnLibroDePrueba()
  postgres = await startPostgres()
  prisma = new PrismaService(postgres.url)
  await prisma.$connect()
  repository = enTransaccion(prisma, new PrismaAccountRepository(prisma))
}, 180_000)

afterAll(async () => {
  await prisma.$disconnect()
  await postgres.stop()
})

beforeEach(async () => {
  await prisma.journalLine.deleteMany()
  await prisma.account.deleteMany()
})

describe('PrismaAccountRepository', () => {
  it('guarda el plan entero respetando el orden de la jerarquía', async () => {
    await repository.saveMany(CHART_SEED.map((props) => unwrap(Account.create(props))))
    const chart = await repository.loadChart()

    expect(chart.all()).toHaveLength(CHART_SEED.length)
    expect(chart.byCode('1190')?.name).toBe('Traslados entre monedas')
    expect(chart.childrenOf('1100').map((a) => a.code)).toEqual([
      '1101',
      '1102',
      '1111',
      '1112',
      '1190',
    ])
  })

  it('el árbol que vuelve de la base valida su propia coherencia', async () => {
    await repository.saveMany(CHART_SEED.map((props) => unwrap(Account.create(props))))
    const chart = await repository.loadChart()

    expect(chart.roots().map((a) => a.code)).toEqual([
      '1000',
      '2000',
      '3000',
      '4000',
      '5000',
      '6000',
    ])
    expect(chart.isPostable('1101')).toBe(true)
    expect(chart.isPostable('1100')).toBe(false)
  })
})

describe('SeedChartUseCase', () => {
  it('siembra el plan cuando la tabla está vacía', async () => {
    expect(await new SeedChartUseCase(repository, prisma).execute()).toBe(CHART_SEED.length)
    expect(await prisma.account.count()).toBe(CHART_SEED.length)
  })

  it('no reaplica la semilla si ya hay cuentas', async () => {
    const useCase = new SeedChartUseCase(repository, prisma)
    await useCase.execute()
    await prisma.account.delete({
      where: { bookId_code: { bookId: LIBRO_DE_PRUEBA.bookId, code: '1190' } },
    })

    expect(await useCase.execute()).toBe(0)
    expect(await prisma.account.count()).toBe(CHART_SEED.length - 1)
  })
})
