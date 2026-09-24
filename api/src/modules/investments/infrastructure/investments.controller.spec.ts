import { conElCandadoRetenido } from '../../../test/candado-retenido.js'
import type { INestApplication } from '@nestjs/common'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AllExceptionsFilter } from '../../../shared/http/all-exceptions.filter.js'
import { PrismaService } from '../../../shared/prisma/prisma.service.js'
import { startPostgres, type RunningPostgres } from '../../../test/postgres-container.js'
import { InvestmentsModule } from '../investments.module.js'
import { entrarEnLibroDePrueba } from '../../../shared/libro/libro-de-prueba.js'

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
  accountCode: '1300',
}

// De dónde sale el capital. Agregar capital es un traslado, no una ganancia.
const capital = (amount: string, date = '2026-07-15') => ({
  date,
  amount: { minorUnits: amount, currency: 'CRC' },
  fromAccountCode: '1101',
})

const crear = async (overrides: object = {}) =>
  (await post('/investments', { ...certificado, ...overrides }).expect(201)).body as { id: string }

// Este test no tiene nada que decir sobre libros, pero toda consulta necesita uno:
// sin contexto la extensión de Prisma corta, que es exactamente lo que queremos.
beforeEach(entrarEnLibroDePrueba)

beforeAll(async () => {
  entrarEnLibroDePrueba()
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
  await prisma.journalLine.deleteMany()
  await prisma.journalEntry.deleteMany()
  await prisma.investmentContribution.deleteMany()
  await prisma.investment.deleteMany()
})

describe('inversiones', () => {
  it('agregar capital mueve la plata en el libro, no la inventa', async () => {
    const inversion = await crear()

    await post(`/investments/${inversion.id}/contributions`, capital('1000000')).expect(201)

    const lineas = await prisma.journalLine.findMany({ include: { entry: true } })
    const destino = lineas.find((linea) => linea.accountCode === '1300')
    const origen = lineas.find((linea) => linea.accountCode === '1101')

    expect(destino?.side).toBe('DEBIT')
    expect(origen?.side).toBe('CREDIT')
    expect(destino?.amountMinor).toBe(1000000n)
    expect(destino?.entry.description).toContain('Certificado')
  })

  it('una inversión sin cuenta no acepta capital', async () => {
    const inversion = await crear({ accountCode: null })

    const response = await post(`/investments/${inversion.id}/contributions`, capital('1000'))

    expect(response.status).toBe(422)
    expect(response.body.error.message).toContain('no tiene cuenta')
  })

  it('proyecta el valor a una fecha con el cálculo compuesto', async () => {
    const inversion = await crear()

    const response = await get(`/investments/${inversion.id}/projection?at=2026-04-15`).expect(200)

    expect(response.body.value.minorUnits).toBe('1030301')
    expect(response.body.interestEarned.minorUnits).toBe('30301')
  })

  it('un aporte capitaliza desde su propia fecha', async () => {
    const inversion = await crear()
    await post(`/investments/${inversion.id}/contributions`, capital('1000000')).expect(201)

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
      ...capital('1000'),
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
    await post(`/investments/${inversion.id}/contributions`, capital('500000')).expect(201)

    await request(app.getHttpServer()).delete(`${BASE}/investments/${inversion.id}`).expect(204)

    expect(await prisma.investmentContribution.count()).toBe(0)
  })
})

// Dos personas sobre la misma inversión, de verdad en paralelo (ADR-006).
describe('dos personas sobre la misma inversión', () => {
  const patch = (path: string, body: object) => request(app.getHttpServer()).patch(`${BASE}${path}`).send(body)
  const del = (path: string) => request(app.getHttpServer()).delete(`${BASE}${path}`)

  it('dos aportes de capital a la vez entran los dos, cada uno con su asiento', async () => {
    const inversion = await crear()

    const respuestas = await conElCandadoRetenido(prisma, 2, () =>
      Promise.all([
        post(`/investments/${inversion.id}/contributions`, capital('1000')),
        post(`/investments/${inversion.id}/contributions`, capital('2000')),
      ]),
    )

    expect(respuestas.map((r) => r.status)).toEqual([201, 201])
    expect(await prisma.investmentContribution.count({ where: { investmentId: inversion.id } })).toBe(2)
    expect(await prisma.journalEntry.count()).toBe(2)
  })

  it('editar con la versión de antes de un aporte responde 409; con la nueva, guarda', async () => {
    const { body: creada } = await post('/investments', certificado).expect(201)
    const { body: aportada } = await post(`/investments/${creada.id}/contributions`, capital('1000')).expect(201)

    await patch(`/investments/${creada.id}`, { name: 'Pisada', version: creada.version }).expect(409)
    await patch(`/investments/${creada.id}`, { name: 'Otra', version: aportada.version }).expect(200)
  })

  it('borrar con una versión vieja responde 409 y la inversión sigue', async () => {
    const { body: creada } = await post('/investments', certificado).expect(201)
    const { body: editada } = await patch(`/investments/${creada.id}`, { name: 'Otra' }).expect(200)

    await del(`/investments/${creada.id}?version=${creada.version}`).expect(409)
    await del(`/investments/${creada.id}?version=${editada.version}`).expect(204)
  })
})
