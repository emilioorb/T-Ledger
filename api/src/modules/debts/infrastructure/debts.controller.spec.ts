import { EventEmitterModule } from '@nestjs/event-emitter'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AllExceptionsFilter } from '../../../shared/http/all-exceptions.filter.js'
import { PrismaService } from '../../../shared/prisma/prisma.service.js'
import { startPostgres, type RunningPostgres } from '../../../test/postgres-container.js'
import { DebtsModule } from '../debts.module.js'
import { entrarEnLibroDePrueba } from '../../../shared/libro/libro-de-prueba.js'

let postgres: RunningPostgres
let app: INestApplication
let prisma: PrismaService

const nuevaDeuda = {
  name: 'CONAPE',
  counterparty: 'CONAPE',
  principal: { minorUnits: '5634929300', currency: 'CRC' },
  annualRate: '9.5',
  compounding: 'MONTHLY',
  termMonths: 120,
  startDate: '2026-01-15',
  kind: 'FRENCH',
  direction: 'BORROWED',
  budgetBucket: 'necesidades',
}

// Este test no tiene nada que decir sobre libros, pero toda consulta necesita uno:
// sin contexto la extensión de Prisma corta, que es exactamente lo que queremos.
beforeEach(entrarEnLibroDePrueba)

beforeAll(async () => {
  entrarEnLibroDePrueba()
  postgres = await startPostgres()
  const moduleRef = await Test.createTestingModule({ imports: [EventEmitterModule.forRoot(), DebtsModule] })
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

describe('POST /api/v1/debts', () => {
  it('crea una deuda y devuelve el monto como string', async () => {
    const response = await request(app.getHttpServer()).post('/api/v1/debts').send(nuevaDeuda)

    expect(response.status).toBe(201)
    expect(response.body.principal).toEqual({ minorUnits: '5634929300', currency: 'CRC' })
    expect(response.body.id).toEqual(expect.any(String))
  })

  it('devuelve el saldo pendiente además del monto original', async () => {
    await request(app.getHttpServer()).post('/api/v1/debts').send(nuevaDeuda).expect(201)

    const response = await request(app.getHttpServer())
      .get('/api/v1/debts?page=1&pageSize=10')
      .expect(200)

    const deuda = response.body.data[0]
    // El original no baja nunca; el pendiente sí, y a la fecha de inicio son iguales.
    expect(deuda.principal.minorUnits).toBe('5634929300')
    expect(BigInt(deuda.outstanding.minorUnits)).toBeLessThan(BigInt(deuda.principal.minorUnits))
  })

  // Es lo que permite comparar contra el cierre del mes pasado en una sola consulta.
  it('el saldo a una fecha anterior es mayor que el de hoy', async () => {
    await request(app.getHttpServer()).post('/api/v1/debts').send(nuevaDeuda).expect(201)

    const antes = await request(app.getHttpServer())
      .get('/api/v1/debts?page=1&pageSize=10&at=2026-03-15')
      .expect(200)
    const hoy = await request(app.getHttpServer())
      .get('/api/v1/debts?page=1&pageSize=10')
      .expect(200)

    expect(BigInt(antes.body.data[0].outstanding.minorUnits)).toBeGreaterThan(
      BigInt(hoy.body.data[0].outstanding.minorUnits),
    )
  })

  it('rechaza una entrada inválida con 400 y el formato de error único', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/debts')
      .send({ ...nuevaDeuda, termMonths: -3 })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
    expect(response.body.error.message).toEqual(expect.any(String))
  })

  it('rechaza con 422 una deuda propia sin cubeta de presupuesto', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/debts')
      .send({ ...nuevaDeuda, budgetBucket: null })

    expect(response.status).toBe(422)
    expect(response.body.error.code).toBe('SEMANTIC_VALIDATION_ERROR')
  })

  it('acepta un préstamo otorgado sin cubeta', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/debts')
      .send({ ...nuevaDeuda, direction: 'LENT', budgetBucket: null, counterparty: 'Andrés' })

    expect(response.status).toBe(201)
    expect(response.body.direction).toBe('LENT')
  })
})

describe('GET /api/v1/debts', () => {
  it('pagina y reporta el total', async () => {
    for (let index = 0; index < 3; index += 1) {
      await request(app.getHttpServer())
        .post('/api/v1/debts')
        .send({ ...nuevaDeuda, name: `Deuda ${index}` })
    }

    const response = await request(app.getHttpServer()).get('/api/v1/debts?page=1&pageSize=2')

    expect(response.status).toBe(200)
    expect(response.body.data).toHaveLength(2)
    expect(response.body.pagination).toEqual({
      page: 1,
      pageSize: 2,
      totalItems: 3,
      totalPages: 2,
    })
  })

  it('filtra por dirección', async () => {
    await request(app.getHttpServer()).post('/api/v1/debts').send(nuevaDeuda)
    await request(app.getHttpServer())
      .post('/api/v1/debts')
      .send({ ...nuevaDeuda, direction: 'LENT', budgetBucket: null })

    const response = await request(app.getHttpServer()).get('/api/v1/debts?direction=LENT')

    expect(response.body.data).toHaveLength(1)
    expect(response.body.data[0].direction).toBe('LENT')
  })
})

describe('GET, PATCH y DELETE /api/v1/debts/:id', () => {
  it('devuelve 404 con el formato de error único para un id inexistente', async () => {
    const response = await request(app.getHttpServer()).get(
      '/api/v1/debts/0199a1c0-0000-7000-8000-00000000ffff',
    )

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('NOT_FOUND')
  })

  it('actualiza parcialmente sin exigir el objeto completo', async () => {
    const created = await request(app.getHttpServer()).post('/api/v1/debts').send(nuevaDeuda)

    const response = await request(app.getHttpServer())
      .patch(`/api/v1/debts/${created.body.id}`)
      .send({ name: 'CONAPE reestructurado' })

    expect(response.status).toBe(200)
    expect(response.body.name).toBe('CONAPE reestructurado')
    expect(response.body.termMonths).toBe(120)
  })

  it('guarda notas, las devuelve y las borra con null', async () => {
    const created = await request(app.getHttpServer()).post('/api/v1/debts').send(nuevaDeuda)
    expect(created.body.notes).toBeNull()

    const conNotas = await request(app.getHttpServer())
      .patch(`/api/v1/debts/${created.body.id}`)
      .send({ notes: '## Contrato\n- Tasa **variable**' })
    expect(conNotas.body.notes).toBe('## Contrato\n- Tasa **variable**')
    expect(conNotas.body.name).toBe(nuevaDeuda.name)

    const sinNotas = await request(app.getHttpServer())
      .patch(`/api/v1/debts/${created.body.id}`)
      .send({ notes: null })
    expect(sinNotas.body.notes).toBeNull()
  })

  it('borra y luego devuelve 404', async () => {
    const created = await request(app.getHttpServer()).post('/api/v1/debts').send(nuevaDeuda)

    expect(
      (await request(app.getHttpServer()).delete(`/api/v1/debts/${created.body.id}`)).status,
    ).toBe(204)
    expect(
      (await request(app.getHttpServer()).get(`/api/v1/debts/${created.body.id}`)).status,
    ).toBe(404)
  })
})
