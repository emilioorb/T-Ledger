import { EventEmitterModule } from '@nestjs/event-emitter'
import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AllExceptionsFilter } from '../../../shared/http/all-exceptions.filter.js'
import { PrismaService } from '../../../shared/prisma/prisma.service.js'
import { startPostgres, type RunningPostgres } from '../../../test/postgres-container.js'
import { AccountingModule } from '../../accounting/accounting.module.js'
import { BudgetModule } from '../budget.module.js'
import { entrarEnLibroDePrueba } from '../../../shared/libro/libro-de-prueba.js'

let postgres: RunningPostgres
let app: INestApplication
let prisma: PrismaService

const BASE = '/api/v1'
const get = (path: string) => request(app.getHttpServer()).get(`${BASE}${path}`)
const post = (path: string, body: object) =>
  request(app.getHttpServer()).post(`${BASE}${path}`).send(body)
const put = (path: string, body: object) =>
  request(app.getHttpServer()).put(`${BASE}${path}`).send(body)

const modelo5030 = {
  name: '50/30/20',
  active: true,
  buckets: [
    {
      id: 'necesidades',
      name: 'Necesidades',
      percentage: '50',
      isSavings: false,
      accountCodes: ['6100'],
    },
    { id: 'deseos', name: 'Deseos', percentage: '30', isSavings: false, accountCodes: [] },
    { id: 'ahorro', name: 'Ahorro', percentage: '20', isSavings: true, accountCodes: [] },
  ],
}

const gastoDe = async (minorUnits: string) => {
  const categoria = await post('/categories', {
    name: `Gasto ${minorUnits}`,
    kind: 'EXPENSE',
    accountCode: '6100',
  }).expect(201)

  await post('/movements', {
    date: '2026-09-12',
    kind: 'EXPENSE',
    categoryId: (categoria.body as { id: string }).id,
    counterparty: 'Proveedor',
    amount: { minorUnits, currency: 'CRC' },
    paymentAccountCode: '1101',
  }).expect(201)
}

// Este test no tiene nada que decir sobre libros, pero toda consulta necesita uno:
// sin contexto la extensión de Prisma corta, que es exactamente lo que queremos.
beforeEach(entrarEnLibroDePrueba)

beforeAll(async () => {
  entrarEnLibroDePrueba()
  postgres = await startPostgres()
  const moduleRef = await Test.createTestingModule({ imports: [EventEmitterModule.forRoot(), AccountingModule, BudgetModule] })
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

beforeEach(async () => {
  await prisma.journalLine.deleteMany()
  await prisma.journalEntry.deleteMany()
  await prisma.movement.deleteMany()
  await prisma.category.deleteMany()
  await prisma.budgetBucket.deleteMany()
  await prisma.budgetModel.deleteMany()
  await prisma.budgetIncome.deleteMany()
})

describe('ingreso del mes', () => {
  it('declararlo y cambiarlo queda en el rastro: primero crear, después editar con lo de antes', async () => {
    await prisma.auditLog.deleteMany({ where: { entityId: 'ingreso-2026-10' } })
    await put('/budget/income/2026-10', { amount: { minorUnits: '100000000', currency: 'CRC' } }).expect(200)
    await put('/budget/income/2026-10', { amount: { minorUnits: '120000000', currency: 'CRC' } }).expect(200)

    const entradas = await prisma.auditLog.findMany({ where: { entity: 'presupuesto', entityId: 'ingreso-2026-10' } })
    expect(entradas.map((entrada) => entrada.action).sort()).toEqual(['crear', 'editar'])
    const edicion = entradas.find((entrada) => entrada.action === 'editar')
    expect(JSON.stringify(edicion?.changes)).toContain('100000000')
    expect(JSON.stringify(edicion?.changes)).toContain('120000000')
  })
})

describe('presupuesto contra la contabilidad', () => {
  it('evalúa el mes con el gasto real de los asientos', async () => {
    await post('/budget-models', modelo5030).expect(201)
    await put('/budget/income/2026-09', {
      amount: { minorUnits: '100000000', currency: 'CRC' },
    }).expect(200)
    await gastoDe('30000000')

    const response = await get('/budget/evaluation?month=2026-09&currency=CRC').expect(200)
    const necesidades = (
      response.body as {
        buckets: {
          bucketId: string
          allocated: { minorUnits: string }
          consumed: { minorUnits: string }
          status: string
        }[]
      }
    ).buckets[0]

    expect(necesidades?.allocated.minorUnits).toBe('50000000')
    expect(necesidades?.consumed.minorUnits).toBe('30000000')
    expect(necesidades?.status).toBe('UNDER')
    expect(response.body.surplus.minorUnits).toBe('70000000')
  })

  it('sin ingreso declarado evalúa igual y lo dice', async () => {
    await post('/budget-models', modelo5030).expect(201)

    const response = await get('/budget/evaluation?month=2026-09&currency=CRC').expect(200)

    expect(response.body.incomeDeclared).toBe(false)
    expect(response.body.income.minorUnits).toBe('0')
  })

  it('sin modelo activo responde 422 diciendo qué falta', async () => {
    const response = await get('/budget/evaluation?month=2026-09&currency=CRC')

    expect(response.status).toBe(422)
    expect(response.body.error.message).toContain('activo')
  })

  it('un modelo cuyos porcentajes no suman 100 es rechazado con 422', async () => {
    const response = await post('/budget-models', {
      ...modelo5030,
      buckets: [
        { id: 'a', name: 'A', percentage: '50', isSavings: false, accountCodes: [] },
        { id: 'b', name: 'B', percentage: '30', isSavings: true, accountCodes: [] },
      ],
    })

    expect(response.status).toBe(422)
  })

  it('activar un modelo desactiva el resto', async () => {
    await post('/budget-models', modelo5030).expect(201)
    await post('/budget-models', {
      name: '70/20/10',
      active: true,
      buckets: [
        { id: 'gastos', name: 'Gastos', percentage: '70', isSavings: false, accountCodes: [] },
        { id: 'ahorro', name: 'Ahorro', percentage: '20', isSavings: true, accountCodes: [] },
        { id: 'deuda', name: 'Deuda', percentage: '10', isSavings: false, accountCodes: [] },
      ],
    }).expect(201)

    const models = await get('/budget-models').expect(200)
    const activos = (models.body as { name: string; active: boolean }[]).filter((m) => m.active)

    expect(activos).toHaveLength(1)
    expect(activos[0]?.name).toBe('70/20/10')
  })

  it('un reintegro baja el consumo de la cubeta', async () => {
    await post('/budget-models', modelo5030).expect(201)
    await gastoDe('30000000')

    // La devolución se registra como un asiento manual que acredita la cuenta de gasto.
    await post('/journal-entries', {
      date: '2026-09-20',
      description: 'Devolución del proveedor',
      lines: [
        { accountCode: '1101', amount: { minorUnits: '5000000', currency: 'CRC' }, side: 'DEBIT' },
        { accountCode: '6100', amount: { minorUnits: '5000000', currency: 'CRC' }, side: 'CREDIT' },
      ],
    }).expect(201)

    const response = await get('/budget/evaluation?month=2026-09&currency=CRC').expect(200)

    expect(response.body.buckets[0].consumed.minorUnits).toBe('25000000')
  })
})

// Los modelos llevan versión (ADR-006).
describe('editar un modelo con versión', () => {
  const patch = (path: string, body: object) => request(app.getHttpServer()).patch(`${BASE}${path}`).send(body)

  it('con una versión vieja responde 409; con la que trae la respuesta, guarda', async () => {
    const { body: creado } = await post('/budget-models', modelo5030).expect(201)
    const { body: editado } = await patch(`/budget-models/${creado.id}`, { ...modelo5030, name: 'Uno', version: creado.version }).expect(200)

    await patch(`/budget-models/${creado.id}`, { ...modelo5030, name: 'Pisado', version: creado.version }).expect(409)
    await patch(`/budget-models/${creado.id}`, { ...modelo5030, name: 'Dos', version: editado.version }).expect(200)
  })

  it('activar otro le sube la versión al que apaga: quien lo editaba no lo vuelve a prender sin enterarse', async () => {
    const { body: primero } = await post('/budget-models', modelo5030).expect(201)
    await post('/budget-models', { ...modelo5030, name: 'Otro' }).expect(201)

    await patch(`/budget-models/${primero.id}`, { ...modelo5030, version: primero.version }).expect(409)
  })

  it('editar no borra y recrea las cubetas que siguen: se diferencian por su clave', async () => {
    const { body: creado } = await post('/budget-models', modelo5030).expect(201)
    const antes = await prisma.budgetBucket.findMany({ where: { modelId: creado.id }, orderBy: { bucketKey: 'asc' } })

    const sinDeseos = {
      ...modelo5030,
      buckets: [
        { ...modelo5030.buckets[0]!, percentage: '80' },
        { ...modelo5030.buckets[2]! },
      ],
    }
    await patch(`/budget-models/${creado.id}`, { ...sinDeseos, version: creado.version }).expect(200)

    const despues = await prisma.budgetBucket.findMany({ where: { modelId: creado.id }, orderBy: { bucketKey: 'asc' } })
    expect(despues.map((cubeta) => cubeta.bucketKey)).toEqual(['ahorro', 'necesidades'])
    expect(despues.map((cubeta) => cubeta.id)).toEqual(
      antes.filter((cubeta) => cubeta.bucketKey !== 'deseos').map((cubeta) => cubeta.id),
    )
    expect(despues.find((cubeta) => cubeta.bucketKey === 'necesidades')?.percentage.toString()).toBe('80')
  })
})

describe('el ingreso del mes con versión', () => {
  it('con una versión vieja responde 409 y no pisa; con la que trae la respuesta, guarda', async () => {
    const { body: primero } = await put('/budget/income/2026-11', { amount: { minorUnits: '100000000', currency: 'CRC' } }).expect(200)
    const { body: segundo } = await put('/budget/income/2026-11', {
      amount: { minorUnits: '110000000', currency: 'CRC' },
      version: primero.version,
    }).expect(200)

    await put('/budget/income/2026-11', { amount: { minorUnits: '1', currency: 'CRC' }, version: primero.version }).expect(409)
    expect((await get('/budget/income/2026-11').expect(200)).body.amount.minorUnits).toBe('110000000')
    expect(segundo.version).toBe(primero.version + 1)
  })

  it('dos que declaran a la vez un mes vacío no se pisan: el segundo recibe 409', async () => {
    await put('/budget/income/2026-12', { amount: { minorUnits: '100', currency: 'CRC' }, version: null }).expect(200)

    await put('/budget/income/2026-12', { amount: { minorUnits: '200', currency: 'CRC' }, version: null }).expect(409)
    expect((await get('/budget/income/2026-12').expect(200)).body.amount.minorUnits).toBe('100')
  })
})

