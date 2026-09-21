import type { INestApplication } from '@nestjs/common'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AllExceptionsFilter } from '../../../shared/http/all-exceptions.filter.js'
import { PrismaService } from '../../../shared/prisma/prisma.service.js'
import { startPostgres, type RunningPostgres } from '../../../test/postgres-container.js'
import { InvestmentsModule } from '../investments.module.js'

let postgres: RunningPostgres
let app: INestApplication
let prisma: PrismaService

const BASE = '/api/v1'
const get = (path: string) => request(app.getHttpServer()).get(`${BASE}${path}`)
const post = (path: string, body: object) =>
  request(app.getHttpServer()).post(`${BASE}${path}`).send(body)

const certificado = {
  name: 'Certificado a plazo',
  principal: { minorUnits: '1000000', currency: 'CRC' },
  annualRate: '12',
  compounding: 'MONTHLY',
  openedAt: '2026-01-15',
  kind: 'FIXED_TERM',
  maturesAt: '2027-01-15',
  accountCode: null,
}

const crear = async (overrides: object = {}) =>
  (await post('/investments', { ...certificado, ...overrides }).expect(201)).body as { id: string }

beforeAll(async () => {
  postgres = await startPostgres()
  const moduleRef = await Test.createTestingModule({
    imports: [EventEmitterModule.forRoot(), InvestmentsModule],
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

beforeEach(async () => {
  await prisma.investmentContribution.deleteMany()
  await prisma.investment.deleteMany()
})

describe('inversiones', () => {
  it('proyecta el valor a una fecha con el cálculo compuesto', async () => {
    const inversion = await crear()

    const response = await get(`/investments/${inversion.id}/projection?at=2026-04-15`).expect(200)

    expect(response.body.value.minorUnits).toBe('1030301')
    expect(response.body.interestEarned.minorUnits).toBe('30301')
  })

  it('un aporte capitaliza desde su propia fecha', async () => {
    const inversion = await crear()
    await post(`/investments/${inversion.id}/contributions`, {
      date: '2026-07-15',
      amount: { minorUnits: '1000000', currency: 'CRC' },
    }).expect(201)

    const response = await get(`/investments/${inversion.id}/projection?at=2027-01-15`).expect(200)

    expect(response.body.value.minorUnits).toBe(String(1_126_825n + 1_061_520n))
  })

  it('una inversión a plazo no sigue rindiendo después de vencer', async () => {
    const inversion = await crear()

    const alVencer = await get(`/investments/${inversion.id}/projection?at=2027-01-15`).expect(200)
    const mucho = await get(`/investments/${inversion.id}/projection?at=2030-01-15`).expect(200)

    expect(mucho.body.value.minorUnits).toBe(alVencer.body.value.minorUnits)
    expect(mucho.body.matured).toBe(true)
  })

  it('un plazo fijo sin vencimiento es rechazado con 422', async () => {
    const response = await post('/investments', { ...certificado, maturesAt: null })

    expect(response.status).toBe(422)
  })

  it('un aporte en otra moneda es rechazado con 422', async () => {
    const inversion = await crear()

    const response = await post(`/investments/${inversion.id}/contributions`, {
      date: '2026-07-15',
      amount: { minorUnits: '1000', currency: 'USD' },
    })

    expect(response.status).toBe(422)
  })

  it('una inversión abierta se guarda sin vencimiento y sigue capitalizando', async () => {
    const abierta = await crear({ kind: 'OPEN', maturesAt: null, name: 'Fondo abierto' })

    const a2027 = await get(`/investments/${abierta.id}/projection?at=2027-01-15`).expect(200)
    const a2030 = await get(`/investments/${abierta.id}/projection?at=2030-01-15`).expect(200)

    expect(BigInt(a2030.body.value.minorUnits)).toBeGreaterThan(BigInt(a2027.body.value.minorUnits))
    expect(a2030.body.matured).toBe(false)
  })

  it('borrar una inversión se lleva sus aportes', async () => {
    const inversion = await crear()
    await post(`/investments/${inversion.id}/contributions`, {
      date: '2026-07-15',
      amount: { minorUnits: '500000', currency: 'CRC' },
    }).expect(201)

    await request(app.getHttpServer()).delete(`${BASE}/investments/${inversion.id}`).expect(204)

    expect(await prisma.investmentContribution.count()).toBe(0)
  })
})
