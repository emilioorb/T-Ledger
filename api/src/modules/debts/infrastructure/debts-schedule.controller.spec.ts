import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AllExceptionsFilter } from '../../../shared/http/all-exceptions.filter.js'
import { PrismaService } from '../../../shared/prisma/prisma.service.js'
import { startPostgres, type RunningPostgres } from '../../../test/postgres-container.js'
import { DebtsModule } from '../debts.module.js'

let postgres: RunningPostgres
let app: INestApplication
let prisma: PrismaService

// Capital ₡100.000, 12 % nominal mensual, 3 cuotas: la misma tabla que valida el dominio.
const tresCuotas = {
  name: 'Préstamo corto',
  counterparty: 'Banco',
  principal: { minorUnits: '10000000', currency: 'CRC' },
  annualRate: '12',
  compounding: 'MONTHLY',
  termMonths: 3,
  startDate: '2026-01-15',
  kind: 'FRENCH',
  direction: 'BORROWED',
  budgetBucket: 'necesidades',
}

const crear = (overrides: Record<string, unknown> = {}) =>
  request(app.getHttpServer()).post('/api/v1/debts').send({ ...tresCuotas, ...overrides })

beforeAll(async () => {
  postgres = await startPostgres()
  const moduleRef = await Test.createTestingModule({ imports: [DebtsModule] })
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
  await prisma.debt.deleteMany()
})

describe('GET /api/v1/debts/:id/schedule', () => {
  it('devuelve la tabla completa con el mismo desglose que el dominio', async () => {
    const created = await crear()
    const response = await request(app.getHttpServer()).get(
      `/api/v1/debts/${created.body.id}/schedule`,
    )

    expect(response.status).toBe(200)
    expect(response.body.installments).toHaveLength(3)
    expect(response.body.installments[0]).toMatchObject({
      number: 1,
      dueDate: '2026-02-15',
      payment: { minorUnits: '3400221', currency: 'CRC' },
      interest: { minorUnits: '100000', currency: 'CRC' },
      principal: { minorUnits: '3300221', currency: 'CRC' },
      balance: { minorUnits: '6699779', currency: 'CRC' },
    })
  })

  it('la última cuota absorbe el residuo y deja el saldo en cero', async () => {
    const created = await crear()
    const response = await request(app.getHttpServer()).get(
      `/api/v1/debts/${created.body.id}/schedule`,
    )

    expect(response.body.installments[2].payment.minorUnits).toBe('3400222')
    expect(response.body.installments[2].balance.minorUnits).toBe('0')
    expect(response.body.totalInterest.minorUnits).toBe('200664')
  })

  it('devuelve 404 para una deuda inexistente', async () => {
    const response = await request(app.getHttpServer()).get(
      '/api/v1/debts/0199a1c0-0000-7000-8000-00000000ffff/schedule',
    )
    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('NOT_FOUND')
  })
})

describe('POST /api/v1/debts/:id/simulate', () => {
  it('reporta el interés ahorrado y los meses ganados', async () => {
    const created = await crear({ termMonths: 12 })
    const response = await request(app.getHttpServer())
      .post(`/api/v1/debts/${created.body.id}/simulate`)
      .send({
        amount: { minorUnits: '3000000', currency: 'CRC' },
        afterInstallment: 1,
        mode: 'REDUCE_TERM',
      })

    expect(response.status).toBe(200)
    expect(Number(response.body.interestSaved.minorUnits)).toBeGreaterThan(0)
    expect(response.body.monthsSaved).toBeGreaterThan(0)
    expect(response.body.withExtraPayment.installments.length).toBeLessThan(
      response.body.baseline.installments.length,
    )
  })

  it('rechaza con 422 un abono posterior a la última cuota', async () => {
    const created = await crear()
    const response = await request(app.getHttpServer())
      .post(`/api/v1/debts/${created.body.id}/simulate`)
      .send({
        amount: { minorUnits: '100000', currency: 'CRC' },
        afterInstallment: 9,
        mode: 'REDUCE_TERM',
      })

    expect(response.status).toBe(422)
    expect(response.body.error.code).toBe('SEMANTIC_VALIDATION_ERROR')
  })

  it('rechaza con 400 un cuerpo sin monto', async () => {
    const created = await crear()
    const response = await request(app.getHttpServer())
      .post(`/api/v1/debts/${created.body.id}/simulate`)
      .send({ afterInstallment: 1, mode: 'REDUCE_TERM' })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
  })
})

describe('GET /api/v1/debts/payoff-plan', () => {
  // El plan de pago ordena deudas vivas: una saldada ya no compite por el excedente y
  // cae al final. Estas fixtures llevan plazo vigente para que el orden sea el de la estrategia.
  const crearViva = (overrides: Record<string, unknown> = {}) => crear({ termMonths: 240, ...overrides })

  it('ordena por tasa descendente con avalancha', async () => {
    await crearViva({ name: 'Barata', annualRate: '9' })
    await crearViva({ name: 'Cara', annualRate: '42' })

    const response = await request(app.getHttpServer()).get(
      '/api/v1/debts/payoff-plan?strategy=avalanche',
    )

    expect(response.status).toBe(200)
    expect(response.body.strategy).toBe('avalanche')
    expect(response.body.order.map((d: { name: string }) => d.name)).toEqual(['Cara', 'Barata'])
  })

  it('ordena por saldo ascendente con bola de nieve', async () => {
    await crearViva({ name: 'Grande', principal: { minorUnits: '50000000', currency: 'CRC' } })
    await crearViva({ name: 'Chica', principal: { minorUnits: '1000000', currency: 'CRC' } })

    const response = await request(app.getHttpServer()).get(
      '/api/v1/debts/payoff-plan?strategy=snowball',
    )

    expect(response.body.order.map((d: { name: string }) => d.name)).toEqual(['Chica', 'Grande'])
  })

  it('deja fuera los préstamos otorgados', async () => {
    await crearViva({ name: 'Propia' })
    await crearViva({ name: 'Prestada', direction: 'LENT', budgetBucket: null })

    const response = await request(app.getHttpServer()).get(
      '/api/v1/debts/payoff-plan?strategy=avalanche',
    )

    expect(response.body.order.map((d: { name: string }) => d.name)).toEqual(['Propia'])
  })

  it('rechaza con 400 una estrategia desconocida', async () => {
    const response = await request(app.getHttpServer()).get(
      '/api/v1/debts/payoff-plan?strategy=magia',
    )
    expect(response.status).toBe(400)
  })
})
