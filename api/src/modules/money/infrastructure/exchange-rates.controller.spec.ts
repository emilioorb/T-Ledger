import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { AllExceptionsFilter } from '../../../shared/http/all-exceptions.filter.js'
import { PrismaService } from '../../../shared/prisma/prisma.service.js'
import { startPostgres, type RunningPostgres } from '../../../test/postgres-container.js'
import { EXCHANGE_RATE_PROVIDER } from '../domain/exchange-rate-provider.port.js'
import { MoneyModule } from '../money.module.js'
import { ExchangeRatesSyncJob } from './exchange-rates-sync.job.js'

let postgres: RunningPostgres
let app: INestApplication
let prisma: PrismaService

beforeAll(async () => {
  postgres = await startPostgres()
  const moduleRef = await Test.createTestingModule({ imports: [MoneyModule] })
    .overrideProvider(PrismaService)
    .useValue(new PrismaService(postgres.url))
    // El test no habla con el banco central: el proveedor y el job se sustituyen.
    .overrideProvider(EXCHANGE_RATE_PROVIDER)
    .useValue({ fetchRates: vi.fn().mockResolvedValue([]) })
    .overrideProvider(ExchangeRatesSyncJob)
    .useValue({ onApplicationBootstrap: vi.fn(), daily: vi.fn() })
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
  await prisma.exchangeRate.deleteMany()
})

describe('GET /api/v1/exchange-rates/latest', () => {
  it('marca la respuesta como desactualizada cuando la última publicación es vieja', async () => {
    await prisma.exchangeRate.createMany({
      data: [
        { indicator: '317', value: '508.02', publishedAt: new Date('2020-01-02T00:00:00.000Z') },
        { indicator: '318', value: '515.30', publishedAt: new Date('2020-01-02T00:00:00.000Z') },
      ],
    })

    const response = await request(app.getHttpServer()).get('/api/v1/exchange-rates/latest')

    expect(response.status).toBe(200)
    expect(response.body.stale).toBe(true)
    expect(response.body.buy.value).toBe('508.02')
    expect(response.body.sell.value).toBe('515.3')
  })

  it('no la marca desactualizada si la publicación es de hoy', async () => {
    const hoy = new Date()
    const soloElDia = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate()))
    await prisma.exchangeRate.createMany({
      data: [
        { indicator: '317', value: '443.27', publishedAt: soloElDia },
        { indicator: '318', value: '449.24', publishedAt: soloElDia },
      ],
    })

    const response = await request(app.getHttpServer()).get('/api/v1/exchange-rates/latest')

    expect(response.body.stale).toBe(false)
  })

  it('responde 200 con valores nulos si nunca se sincronizó, no 500', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/exchange-rates/latest')

    expect(response.status).toBe(200)
    expect(response.body.buy).toBeNull()
    expect(response.body.stale).toBe(true)
  })
})

describe('GET /api/v1/exchange-rates', () => {
  it('devuelve el rango pedido ordenado por fecha', async () => {
    await prisma.exchangeRate.createMany({
      data: [
        { indicator: '317', value: '443.20', publishedAt: new Date('2026-09-18T00:00:00.000Z') },
        { indicator: '317', value: '443.43', publishedAt: new Date('2026-09-17T00:00:00.000Z') },
        { indicator: '318', value: '449.24', publishedAt: new Date('2026-09-19T00:00:00.000Z') },
      ],
    })

    const response = await request(app.getHttpServer()).get(
      '/api/v1/exchange-rates?indicator=317&from=2026-09-17&to=2026-09-18',
    )

    expect(response.status).toBe(200)
    expect(response.body.map((r: { publishedAt: string }) => r.publishedAt)).toEqual([
      '2026-09-17',
      '2026-09-18',
    ])
  })

  it('rechaza con 400 un rango con fechas mal formadas', async () => {
    const response = await request(app.getHttpServer()).get(
      '/api/v1/exchange-rates?from=18/09/2026&to=18/09/2026',
    )
    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('rechaza con 422 un rango invertido', async () => {
    const response = await request(app.getHttpServer()).get(
      '/api/v1/exchange-rates?from=2026-09-19&to=2026-09-17',
    )
    expect(response.status).toBe(422)
    expect(response.body.error.code).toBe('SEMANTIC_VALIDATION_ERROR')
  })
})
