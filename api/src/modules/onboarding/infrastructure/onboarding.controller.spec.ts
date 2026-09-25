import { EventEmitterModule } from '@nestjs/event-emitter'
import type { INestApplication } from '@nestjs/common'
import { Global, Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { AllExceptionsFilter } from '../../../shared/http/all-exceptions.filter.js'
import { SemanticValidationError } from '../../../shared/http/api-error.js'
import { entrarEnLibro } from '../../../shared/libro/libro-context.js'
import { LIBRO_DE_PRUEBA } from '../../../shared/libro/libro-de-prueba.js'
import { PrismaService } from '../../../shared/prisma/prisma.service.js'
import { startPostgres, type RunningPostgres } from '../../../test/postgres-container.js'
import { ManageBankAccountsUseCase } from '../../banking/application/manage-bank-accounts.use-case.js'
import { MARCA_DE_BIENVENIDA, type MarcaDeBienvenida } from '../../identity/domain/marca-de-bienvenida.port.js'
import { PermisoGuard } from '../../identity/infrastructure/permiso.guard.js'
import { RastroModule } from '../../auditoria/rastro.module.js'
import { OnboardingModule } from '../onboarding.module.js'

let postgres: RunningPostgres
let app: INestApplication
let prisma: PrismaService
const vistas = new Set<string>()

// La marca de verdad vive en tablas de Better Auth; acá alcanza con un doble en memoria.
const marcaEnMemoria: MarcaDeBienvenida = {
  vista: async (userId) => vistas.has(userId),
  marcar: async (userId) => void vistas.add(userId),
}

@Global()
@Module({
  providers: [{ provide: MARCA_DE_BIENVENIDA, useValue: marcaEnMemoria }, { provide: APP_GUARD, useClass: PermisoGuard }],
  exports: [MARCA_DE_BIENVENIDA],
})
class IdentidadDePrueba {}

const BASE = '/api/v1/onboarding'
const pedir = {
  get: (path = '') => request(app.getHttpServer()).get(`${BASE}${path}`),
  post: (path: string, body: object = {}) => request(app.getHttpServer()).post(`${BASE}${path}`).send(body),
}

const comoDueno = () => entrarEnLibro(LIBRO_DE_PRUEBA)
const comoEditor = () => entrarEnLibro({ ...LIBRO_DE_PRUEBA, rol: 'editor' })

// Los pasos de la bienvenida escriben cuentas y cuentas bancarias; entre tests hay que dejar
// solo la semilla. Rangos precisos, no `>= '1121'`: la 1190 (Traslados entre monedas) es
// semilla y de otro modo caería con una comparación de string.
const limpiar = (): Promise<void> =>
  prisma.withTransaction(async () => {
    await prisma.client.onboardingStep.deleteMany()
    await prisma.client.bankAccount.deleteMany()
    await prisma.client.category.deleteMany()
    await prisma.client.journalLine.deleteMany()
    await prisma.client.journalEntry.deleteMany()
    await prisma.client.budgetIncome.deleteMany()
    await prisma.client.account.deleteMany({
      where: {
        OR: [
          { code: { gte: '1121', lte: '1189' } },
          { code: { gte: '4200', lte: '4299' } },
          { code: { gte: '6200', lte: '6299' } },
        ],
      },
    })
  })

beforeEach(async () => {
  comoDueno()
  vistas.clear()
  await limpiar()
})

afterEach(() => {
  vi.restoreAllMocks()
})

beforeAll(async () => {
  comoDueno()
  postgres = await startPostgres()
  const moduleRef = await Test.createTestingModule({
    imports: [EventEmitterModule.forRoot(), IdentidadDePrueba, RastroModule, OnboardingModule],
  })
    .overrideProvider(PrismaService)
    .useValue(new PrismaService(postgres.url))
    .compile()
  app = moduleRef.createNestApplication()
  app.setGlobalPrefix('api/v1')
  app.useGlobalFilters(new AllExceptionsFilter())
  await app.init()
  prisma = app.get(PrismaService)
}, 180_000)

afterAll(async () => {
  await app.close()
  await postgres.stop()
})

describe('estado', () => {
  it('el dueño que no la vio la tiene pendiente, con el libro en que se abrió', async () => {
    const { body } = await pedir.get().expect(200)
    expect(body).toEqual({ pending: true, bookId: LIBRO_DE_PRUEBA.bookId, steps: {} })
  })

  it('un editor nunca la tiene pendiente', async () => {
    comoEditor()
    const { body } = await pedir.get().expect(200)
    expect(body.pending).toBe(false)
  })

  it('empezar la marca, y empezar dos veces da 204 las dos', async () => {
    await pedir.post('/start').expect(204)
    await pedir.post('/start').expect(204)
    const { body } = await pedir.get().expect(200)
    expect(body.pending).toBe(false)
  })

  it('un editor no puede empezarla', async () => {
    comoEditor()
    await pedir.post('/start').expect(403)
  })
})

describe('bancos', () => {
  const bancos = { banks: [{ name: 'BAC', currency: 'CRC' }, { name: 'BAC', currency: 'USD' }] }

  it('crea una cuenta bajo 1100 y su cuenta bancaria por cada uno', async () => {
    const { body } = await pedir.post('/banks', bancos).expect(201)
    expect(body).toEqual([
      { name: 'BAC colones', currency: 'CRC', accountCode: '1121', bankAccountId: expect.any(String) },
      { name: 'BAC dólares', currency: 'USD', accountCode: '1122', bankAccountId: expect.any(String) },
    ])
    const cuenta = await prisma.client.account.findFirst({ where: { code: '1121' } })
    expect(cuenta).toMatchObject({ parentCode: '1100', accountClass: 'ASSET', name: 'BAC colones' })
  })

  it('repetido devuelve lo mismo y no crea nada nuevo', async () => {
    const primera = await pedir.post('/banks', bancos).expect(201)
    const segunda = await pedir.post('/banks', { banks: [{ name: 'Otro', currency: 'CRC' }] }).expect(201)
    expect(segunda.body).toEqual(primera.body)
    expect(await prisma.client.bankAccount.count()).toBe(2)
  })

  it('si uno falla no queda ninguno ni la anotación del paso', async () => {
    const casoDeUso = app.get(ManageBankAccountsUseCase, { strict: false })
    const original = casoDeUso.create.bind(casoDeUso)
    vi.spyOn(casoDeUso, 'create')
      .mockImplementationOnce(original)
      .mockRejectedValueOnce(new SemanticValidationError('falla a propósito'))
    await pedir.post('/banks', { banks: [{ name: 'BAC', currency: 'CRC' }, { name: 'BCR', currency: 'CRC' }] }).expect(422)
    expect(await prisma.client.bankAccount.count()).toBe(0)
    expect(await prisma.client.account.count({ where: { code: { in: ['1121', '1122'] } } })).toBe(0)
    expect(await prisma.client.onboardingStep.count()).toBe(0)
  })

  it('un editor recibe 403', async () => {
    comoEditor()
    await pedir.post('/banks', bancos).expect(403)
  })
})

describe('saldos iniciales', () => {
  const lineas = async (currency: string) =>
    prisma.client.journalLine.findMany({ where: { currency }, select: { accountCode: true, side: true, amountMinor: true } })

  it('un asiento por moneda, contra Aportes, con sobregiro al haber', async () => {
    await pedir.post('/banks', { banks: [{ name: 'BAC', currency: 'CRC' }, { name: 'BN', currency: 'CRC' }] }).expect(201)
    const { body } = await pedir
      .post('/opening-balances', {
        date: '2026-09-25',
        balances: [
          { accountCode: '1101', amount: '50000' },
          { accountCode: '1121', amount: '300000' },
          { accountCode: '1122', amount: '-20000' },
        ],
      })
      .expect(201)
    expect(body.entries).toHaveLength(1)
    expect(await lineas('CRC')).toEqual(
      expect.arrayContaining([
        { accountCode: '1101', side: 'DEBIT', amountMinor: 50000n },
        { accountCode: '1121', side: 'DEBIT', amountMinor: 300000n },
        { accountCode: '1122', side: 'CREDIT', amountMinor: 20000n },
        { accountCode: '3110', side: 'CREDIT', amountMinor: 330000n },
      ]),
    )
  })

  it('una caja en negativo da 422', async () => {
    await pedir.post('/opening-balances', { date: '2026-09-25', balances: [{ accountCode: '1101', amount: '-1' }] }).expect(422)
  })

  it('neto cero no lleva contrapartida', async () => {
    await pedir.post('/banks', { banks: [{ name: 'BAC', currency: 'CRC' }] }).expect(201)
    await pedir
      .post('/opening-balances', { date: '2026-09-25', balances: [{ accountCode: '1101', amount: '100' }, { accountCode: '1121', amount: '-100' }] })
      .expect(201)
    expect((await lineas('CRC')).map((linea) => linea.accountCode).sort()).toEqual(['1101', '1121'])
  })

  it('los ceros se ignoran y sin nada que asentar no hay asientos', async () => {
    const { body } = await pedir.post('/opening-balances', { date: '2026-09-25', balances: [{ accountCode: '1101', amount: '0' }] }).expect(201)
    expect(body.entries).toEqual([])
  })

  it('una cuenta que no es caja ni banco de la bienvenida da 422', async () => {
    await pedir.post('/opening-balances', { date: '2026-09-25', balances: [{ accountCode: '1111', amount: '5' }] }).expect(422)
  })

  it('una cuenta repetida en el pedido da 400', async () => {
    await pedir
      .post('/opening-balances', { date: '2026-09-25', balances: [{ accountCode: '1101', amount: '5' }, { accountCode: '1101', amount: '6' }] })
      .expect(400)
  })

  it('repetido no duplica el asiento', async () => {
    const pedido = { date: '2026-09-25', balances: [{ accountCode: '1101', amount: '5' }] }
    const primera = await pedir.post('/opening-balances', pedido).expect(201)
    const segunda = await pedir.post('/opening-balances', pedido).expect(201)
    expect(segunda.body).toEqual(primera.body)
    expect(await prisma.client.journalEntry.count()).toBe(1)
  })

  it('un monto por encima del tope del sistema da 400', async () => {
    await pedir
      .post('/opening-balances', { date: '2026-09-25', balances: [{ accountCode: '1101', amount: '200000000000000' }] })
      .expect(400)
  })

  it('la suma de montos válidos por encima del tope da 422', async () => {
    await pedir.post('/banks', { banks: [{ name: 'BAC', currency: 'CRC' }] }).expect(201)
    await pedir
      .post('/opening-balances', {
        date: '2026-09-25',
        balances: [
          { accountCode: '1101', amount: '60000000000000' },
          { accountCode: '1121', amount: '60000000000000' },
        ],
      })
      .expect(422)
  })

  it('un sobregiro de banco mayor a la caja deja Aportes al debe con el neto negativo', async () => {
    await pedir.post('/banks', { banks: [{ name: 'BAC', currency: 'CRC' }] }).expect(201)
    await pedir
      .post('/opening-balances', {
        date: '2026-09-25',
        balances: [
          { accountCode: '1101', amount: '100' },
          { accountCode: '1121', amount: '-500' },
        ],
      })
      .expect(201)
    expect(await lineas('CRC')).toEqual(
      expect.arrayContaining([
        { accountCode: '1101', side: 'DEBIT', amountMinor: 100n },
        { accountCode: '1121', side: 'CREDIT', amountMinor: 500n },
        { accountCode: '3110', side: 'DEBIT', amountMinor: 400n },
      ]),
    )
  })

  it('CRC y USD en el mismo pedido dan un asiento por moneda', async () => {
    const { body } = await pedir
      .post('/opening-balances', {
        date: '2026-09-25',
        balances: [
          { accountCode: '1101', amount: '100' },
          { accountCode: '1102', amount: '50' },
        ],
      })
      .expect(201)
    expect(body.entries).toHaveLength(2)
    expect((body.entries as { currency: string }[]).map((entry) => entry.currency).sort()).toEqual(['CRC', 'USD'])
    expect(await lineas('USD')).toEqual(
      expect.arrayContaining([
        { accountCode: '1102', side: 'DEBIT', amountMinor: 50n },
        { accountCode: '3110', side: 'CREDIT', amountMinor: 50n },
      ]),
    )
  })

  it('un editor recibe 403', async () => {
    comoEditor()
    await pedir.post('/opening-balances', { date: '2026-09-25', balances: [{ accountCode: '1101', amount: '5' }] }).expect(403)
  })
})

describe('categorías', () => {
  it('cada una con su cuenta bajo la agrupadora de su tipo', async () => {
    const { body } = await pedir
      .post('/categories', { categories: [{ name: 'Supermercado', kind: 'EXPENSE' }, { name: 'Casa', kind: 'EXPENSE' }, { name: 'Salario', kind: 'INCOME' }] })
      .expect(201)
    expect(body).toEqual([
      { name: 'Supermercado', kind: 'EXPENSE', accountCode: '6201', categoryId: expect.any(String) },
      { name: 'Casa', kind: 'EXPENSE', accountCode: '6202', categoryId: expect.any(String) },
      { name: 'Salario', kind: 'INCOME', accountCode: '4201', categoryId: expect.any(String) },
    ])
    expect(await prisma.client.account.findFirst({ where: { code: '6200' } })).toMatchObject({ parentCode: '6000', accountClass: 'OPERATING_EXPENSE' })
    expect(await prisma.client.account.findFirst({ where: { code: '6201' } })).toMatchObject({ parentCode: '6200', name: 'Supermercado' })
    expect(await prisma.client.category.findFirst({ where: { name: 'Salario' } })).toMatchObject({ kind: 'INCOME', accountCode: '4201' })
  })

  it('un nombre repetido en el pedido, sin importar mayúsculas ni espacios, da 409 y no crea nada', async () => {
    await pedir.post('/categories', { categories: [{ name: 'Casa', kind: 'EXPENSE' }, { name: ' casa ', kind: 'EXPENSE' }] }).expect(409)
    expect(await prisma.client.category.count()).toBe(0)
  })

  it('un nombre que ya existe en el libro da 409', async () => {
    await prisma.withTransaction(() =>
      prisma.client.category.create({ data: { id: 'c1', bookId: LIBRO_DE_PRUEBA.bookId, name: 'Casa', kind: 'EXPENSE', sortOrder: 0, active: true } }),
    )
    await pedir.post('/categories', { categories: [{ name: 'Casa', kind: 'EXPENSE' }] }).expect(409)
  })

  it('si 6200 ya existe y acepta asientos, 422', async () => {
    await prisma.withTransaction(() =>
      prisma.client.account.create({ data: { bookId: LIBRO_DE_PRUEBA.bookId, code: '6200', name: 'Mía', accountClass: 'OPERATING_EXPENSE', parentCode: '6000' } }),
    )
    await pedir.post('/categories', { categories: [{ name: 'Casa', kind: 'EXPENSE' }] }).expect(422)
  })

  it('repetido devuelve lo mismo', async () => {
    const pedido = { categories: [{ name: 'Casa', kind: 'EXPENSE' }] }
    const primera = await pedir.post('/categories', pedido).expect(201)
    const segunda = await pedir.post('/categories', pedido).expect(201)
    expect(segunda.body).toEqual(primera.body)
  })

  it('un editor recibe 403', async () => {
    comoEditor()
    await pedir.post('/categories', { categories: [{ name: 'Casa', kind: 'EXPENSE' }] }).expect(403)
  })
})

describe('ingreso', () => {
  it('declara el ingreso del mes y repetido devuelve lo mismo', async () => {
    const pedido = { month: '2026-09', amount: { minorUnits: '85000000', currency: 'CRC' } }
    const primera = await pedir.post('/income', pedido).expect(201)
    expect(primera.body).toEqual(pedido)
    const segunda = await pedir.post('/income', { ...pedido, amount: { minorUnits: '1', currency: 'CRC' } }).expect(201)
    expect(segunda.body).toEqual(pedido)
  })

  it('un mes con otra forma da 400', async () => {
    await pedir.post('/income', { month: '2026-13', amount: { minorUnits: '1', currency: 'CRC' } }).expect(400)
  })

  it('un editor recibe 403', async () => {
    comoEditor()
    await pedir.post('/income', { month: '2026-09', amount: { minorUnits: '1', currency: 'CRC' } }).expect(403)
  })
})
