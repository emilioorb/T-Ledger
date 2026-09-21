import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AllExceptionsFilter } from '../../../shared/http/all-exceptions.filter.js'
import { PrismaService } from '../../../shared/prisma/prisma.service.js'
import { startPostgres, type RunningPostgres } from '../../../test/postgres-container.js'
import { AccountingModule } from '../accounting.module.js'

let postgres: RunningPostgres
let app: INestApplication
let prisma: PrismaService

const BASE = '/api/v1'

const get = (path: string) => request(app.getHttpServer()).get(`${BASE}${path}`)
const post = (path: string, body?: object) =>
  body === undefined
    ? request(app.getHttpServer()).post(`${BASE}${path}`)
    : request(app.getHttpServer()).post(`${BASE}${path}`).send(body)
const del = (path: string) => request(app.getHttpServer()).delete(`${BASE}${path}`)

const crearCategoria = async (body: {
  name: string
  kind: 'EXPENSE' | 'INCOME'
  accountCode: string | null
}) => (await post('/categories', body).expect(201)).body as { id: string }

const crearMovimientoRaw = (overrides: Record<string, unknown> = {}) =>
  post('/movements', {
    date: '2026-09-16',
    kind: 'EXPENSE',
    counterparty: 'Proveedor',
    amount: { minorUnits: '2000000', currency: 'CRC' },
    paymentAccountCode: '1101',
    ...overrides,
  })

const crearMovimientoSimple = async () => {
  const categoria = await crearCategoria({ name: 'Software', kind: 'EXPENSE', accountCode: '6100' })
  const response = await crearMovimientoRaw({ categoryId: categoria.id }).expect(201)
  return response.body as { id: string }
}

const cerrarHasta = async (period: string) => post(`/periods/${period}/close`).expect(200)

const asientoValido = {
  date: '2026-09-16',
  description: 'Asiento manual',
  lines: [
    { accountCode: '6100', amount: { minorUnits: '100000', currency: 'CRC' }, side: 'DEBIT' },
    { accountCode: '1101', amount: { minorUnits: '100000', currency: 'CRC' }, side: 'CREDIT' },
  ],
}

beforeAll(async () => {
  postgres = await startPostgres()
  const moduleRef = await Test.createTestingModule({ imports: [AccountingModule] })
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
  await prisma.accountingPeriod.deleteMany()
})

describe('flujo completo de contabilidad', () => {
  it('siembra el plan de cuentas al arrancar', async () => {
    const response = await get('/accounts?pageSize=100').expect(200)

    expect(response.body.data.map((a: { code: string }) => a.code)).toContain('1101')
  })

  it('un movimiento de gasto aparece en el mayor de su cuenta', async () => {
    await crearMovimientoSimple()

    const mayor = await get(
      '/reports/ledger?account=6100&currency=CRC&from=2026-09-01&to=2026-09-30',
    ).expect(200)

    expect(mayor.body.rows).toHaveLength(1)
    expect(mayor.body.rows[0].debit.minorUnits).toBe('2000000')
    expect(mayor.body.closingBalance.minorUnits).toBe('2000000')
  })

  it('la comprobación del período cuadra después de cargar movimientos', async () => {
    await crearMovimientoSimple()

    const comprobacion = await get(
      '/reports/trial-balance?currency=CRC&from=2026-09-01&to=2026-09-30',
    )

    expect(comprobacion.status).toBe(200)
    expect(comprobacion.body.balances).toBe(true)
    expect(comprobacion.body.difference.minorUnits).toBe('0')
  })

  it('la comprobación también se descarga como CSV, con las mismas filas', async () => {
    await crearMovimientoSimple()

    const csv = await get(
      '/reports/trial-balance?currency=CRC&from=2026-09-01&to=2026-09-30&format=csv',
    ).expect(200)

    expect(csv.headers['content-type']).toContain('text/csv')
    expect(csv.headers['content-disposition']).toContain('attachment')
    expect(csv.text).toContain('6100')
    expect(csv.text).toContain('2000000')
  })

  it('anular deja el original y su reversión en el mayor, y el saldo en cero', async () => {
    const movimiento = await crearMovimientoSimple()

    expect((await post(`/movements/${movimiento.id}/void`)).status).toBe(200)

    const mayor = await get(
      '/reports/ledger?account=6100&currency=CRC&from=2026-09-01&to=2026-09-30',
    ).expect(200)

    expect(mayor.body.rows).toHaveLength(2)
    expect(mayor.body.closingBalance.minorUnits).toBe('0')
  })

  it('un movimiento de categoría sin cuenta se guarda y se marca como no contabilizado', async () => {
    const categoria = await crearCategoria({ name: 'Sin mapear', kind: 'EXPENSE', accountCode: null })

    const response = await crearMovimientoRaw({ categoryId: categoria.id })

    expect(response.status).toBe(201)
    expect(response.body.posted).toBe(false)
    expect(response.body.journalEntryId).toBeNull()
  })

  it('el estado de situación cuadra', async () => {
    await crearMovimientoSimple()

    const situacion = await get('/reports/financial-position?currency=CRC&at=2026-09-30').expect(200)

    expect(situacion.body.balances).toBe(true)
  })

  it('el estado de resultados muestra el gasto del mes', async () => {
    await crearMovimientoSimple()

    const resultados = await get(
      '/reports/income-statement?currency=CRC&from=2026-09-01&to=2026-09-30',
    ).expect(200)

    expect(resultados.body.operatingExpenses.minorUnits).toBe('2000000')
    expect(resultados.body.result.minorUnits).toBe('-2000000')
  })

  it('el árbol de cuentas trae el saldo acumulado de las agrupadoras', async () => {
    await crearMovimientoSimple()

    const arbol = await get('/accounts/tree?currency=CRC&at=2026-09-30').expect(200)
    const gastos = arbol.body.find((node: { code: string }) => node.code === '6000')

    expect(gastos.balance.minorUnits).toBe('2000000')
  })

  it('cerrar un mes con el anterior abierto responde 422 con la razón', async () => {
    await crearMovimientoRaw({
      categoryId: (await crearCategoria({ name: 'Agosto', kind: 'EXPENSE', accountCode: '6100' })).id,
      date: '2026-08-15',
    }).expect(201)
    await crearMovimientoSimple()

    const response = await post('/periods/2026-09/close')

    expect(response.status).toBe(422)
    expect(response.body.error.details.blockers[0].code).toBe('PREVIOUS_PERIOD_OPEN')
    expect(response.body.error.details.blockers[0].reason).toContain('2026-08')
  })

  it('un asiento con fecha en un período cerrado responde 409', async () => {
    await cerrarHasta('2026-08')

    const response = await crearMovimientoRaw({
      categoryId: (await crearCategoria({ name: 'Software', kind: 'EXPENSE', accountCode: '6100' })).id,
      date: '2026-08-15',
    })

    expect(response.status).toBe(409)
    expect(response.body.error.code).toBe('CONFLICT')
  })

  it('anular un movimiento de un período cerrado también responde 409', async () => {
    const categoria = await crearCategoria({ name: 'Software', kind: 'EXPENSE', accountCode: '6100' })
    const movimiento = await crearMovimientoRaw({
      categoryId: categoria.id,
      date: '2026-08-15',
    }).expect(201)
    await cerrarHasta('2026-08')

    expect((await post(`/movements/${movimiento.body.id}/void`)).status).toBe(409)
  })

  it('reabrir un mes reabre también los posteriores cerrados', async () => {
    await crearMovimientoSimple()
    await cerrarHasta('2026-08')
    await cerrarHasta('2026-09')

    await post('/periods/2026-08/reopen').expect(200)

    const periodos = await get('/periods').expect(200)
    const septiembre = periodos.body.data.find((p: { period: string }) => p.period === '2026-09')

    expect(septiembre.status).toBe('OPEN')
  })

  it('un asiento manual descuadrado responde 422', async () => {
    const response = await post('/journal-entries', {
      date: '2026-09-16',
      description: 'Descuadrado',
      lines: [
        { accountCode: '6100', amount: { minorUnits: '1000', currency: 'CRC' }, side: 'DEBIT' },
        { accountCode: '1101', amount: { minorUnits: '900', currency: 'CRC' }, side: 'CREDIT' },
      ],
    })

    expect(response.status).toBe(422)
  })

  it('un asiento de conversión entre monedas es aceptado', async () => {
    const response = await post('/journal-entries', {
      date: '2026-09-16',
      description: 'Compra de dólares',
      lines: [
        { accountCode: '1190', amount: { minorUnits: '50800000', currency: 'CRC' }, side: 'DEBIT' },
        { accountCode: '1101', amount: { minorUnits: '50800000', currency: 'CRC' }, side: 'CREDIT' },
        { accountCode: '1102', amount: { minorUnits: '100000', currency: 'USD' }, side: 'DEBIT' },
        { accountCode: '1190', amount: { minorUnits: '100000', currency: 'USD' }, side: 'CREDIT' },
      ],
    })

    expect(response.status).toBe(201)
  })

  it('no existe forma de borrar un asiento', async () => {
    const entry = await post('/journal-entries', asientoValido).expect(201)

    expect((await del(`/journal-entries/${entry.body.id}`)).status).toBe(404)
  })
})
