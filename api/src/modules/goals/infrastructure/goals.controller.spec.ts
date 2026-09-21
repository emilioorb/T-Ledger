import type { INestApplication } from '@nestjs/common'
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { AllExceptionsFilter } from '../../../shared/http/all-exceptions.filter.js'
import { PrismaService } from '../../../shared/prisma/prisma.service.js'
import { startPostgres, type RunningPostgres } from '../../../test/postgres-container.js'
import { GOAL_REACHED } from '../domain/goal-events.js'
import { GoalsModule } from '../goals.module.js'
import { entrarEnLibroDePrueba } from '../../../shared/libro/libro-de-prueba.js'

let postgres: RunningPostgres
let app: INestApplication
let prisma: PrismaService
let events: EventEmitter2

const BASE = '/api/v1'
const get = (path: string) => request(app.getHttpServer()).get(`${BASE}${path}`)
const post = (path: string, body: object) =>
  request(app.getHttpServer()).post(`${BASE}${path}`).send(body)

const nuevaMeta = {
  name: 'Europa',
  target: { minorUnits: '500000000', currency: 'CRC' },
  desiredDate: '2027-09-01',
  priority: 1,
  accountCode: '1111',
}

// De dónde sale la plata del aporte. Un aporte es un traslado, no un gasto.
const aporte = (amount: string, date = '2026-09-15') => ({
  date,
  amount: { minorUnits: amount, currency: 'CRC' },
  fromAccountCode: '1101',
})

const crearMeta = async (overrides: object = {}) =>
  (await post('/goals', { ...nuevaMeta, ...overrides }).expect(201)).body as { id: string }

// Este test no tiene nada que decir sobre libros, pero toda consulta necesita uno:
// sin contexto la extensión de Prisma corta, que es exactamente lo que queremos.
beforeEach(entrarEnLibroDePrueba)

beforeAll(async () => {
  entrarEnLibroDePrueba()
  postgres = await startPostgres()
  const moduleRef = await Test.createTestingModule({
    imports: [EventEmitterModule.forRoot(), GoalsModule],
  })
    .overrideProvider(PrismaService)
    .useValue(new PrismaService(postgres.url))
    .compile()

  app = moduleRef.createNestApplication()
  app.setGlobalPrefix('api/v1')
  app.useGlobalFilters(new AllExceptionsFilter())
  await app.init()
  prisma = app.get(PrismaService)
  events = app.get(EventEmitter2)
}, 180_000)

afterAll(async () => {
  await app.close()
  await postgres.stop()
})

beforeEach(async () => {
  await prisma.journalLine.deleteMany()
  await prisma.journalEntry.deleteMany()
  await prisma.goalContribution.deleteMany()
  await prisma.goal.deleteMany()
})

describe('metas', () => {
  it('un aporte mueve la plata en el libro, no la inventa', async () => {
    const meta = await crearMeta()

    await post(`/goals/${meta.id}/contributions`, aporte('200000000')).expect(201)

    const lineas = await prisma.journalLine.findMany({ include: { entry: true } })
    const ahorro = lineas.find((linea) => linea.accountCode === '1111')
    const origen = lineas.find((linea) => linea.accountCode === '1101')

    expect(ahorro?.side).toBe('DEBIT')
    expect(origen?.side).toBe('CREDIT')
    expect(ahorro?.amountMinor).toBe(200000000n)
    expect(ahorro?.entry.description).toContain('Europa')
  })

  it('una meta sin cuenta de ahorro no acepta aportes', async () => {
    const meta = await crearMeta({ accountCode: null })

    const response = await post(`/goals/${meta.id}/contributions`, aporte('100000'))

    expect(response.status).toBe(422)
    expect(response.body.error.message).toContain('cuenta de ahorro')
  })

  it('una meta recién creada no tiene fecha proyectada', async () => {
    const response = await post('/goals', nuevaMeta).expect(201)

    expect(response.body.projectedDate).toBeNull()
    expect(response.body.remaining.minorUnits).toBe('500000000')
    expect(response.body.onTrack).toBe(false)
  })

  it('el aporte requerido baja con cada aporte', async () => {
    const meta = await crearMeta()

    const antes = await get(`/goals/${meta.id}`).expect(200)
    await post(`/goals/${meta.id}/contributions`, aporte('200000000')).expect(201)
    const despues = await get(`/goals/${meta.id}`).expect(200)

    expect(BigInt(despues.body.requiredMonthlyContribution.minorUnits)).toBeLessThan(
      BigInt(antes.body.requiredMonthlyContribution.minorUnits),
    )
    expect(despues.body.contributed.minorUnits).toBe('200000000')
  })

  it('un aporte en otra moneda es rechazado con 422', async () => {
    const meta = await crearMeta()

    const response = await post(`/goals/${meta.id}/contributions`, {
      ...aporte('1000'),
      amount: { minorUnits: '1000', currency: 'USD' },
    })

    expect(response.status).toBe(422)
  })

  it('alcanzar la meta emite el evento una sola vez', async () => {
    const listener = vi.fn()
    events.on(GOAL_REACHED, listener)
    const meta = await crearMeta()

    await post(`/goals/${meta.id}/contributions`, aporte('500000000')).expect(201)
    await post(`/goals/${meta.id}/contributions`, aporte('100', '2026-10-15')).expect(201)

    expect(listener).toHaveBeenCalledTimes(1)
    events.off(GOAL_REACHED, listener)
  })

  it('una meta alcanzada no pide más aportes', async () => {
    const meta = await crearMeta()
    await post(`/goals/${meta.id}/contributions`, {
      ...aporte('500000000'),
    }).expect(201)

    const response = await get(`/goals/${meta.id}`).expect(200)

    expect(response.body.reached).toBe(true)
    expect(response.body.requiredMonthlyContribution.minorUnits).toBe('0')
    expect(response.body.progress).toBe('100')
  })

  it('las metas se listan por prioridad', async () => {
    await crearMeta({ name: 'Segunda', priority: 2 })
    await crearMeta({ name: 'Primera', priority: 1 })

    const response = await get('/goals').expect(200)

    expect((response.body as { name: string }[]).map((goal) => goal.name)).toEqual([
      'Primera',
      'Segunda',
    ])
  })

  it('borrar una meta se lleva sus aportes', async () => {
    const meta = await crearMeta()
    await post(`/goals/${meta.id}/contributions`, aporte('100000')).expect(201)

    await request(app.getHttpServer()).delete(`${BASE}/goals/${meta.id}`).expect(204)

    expect(await prisma.goalContribution.count()).toBe(0)
  })
})
