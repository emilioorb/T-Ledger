import { EventEmitterModule } from '@nestjs/event-emitter'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AllExceptionsFilter } from '../../../shared/http/all-exceptions.filter.js'
import { LIBRO_DE_PRUEBA, entrarEnLibroDePrueba } from '../../../shared/libro/libro-de-prueba.js'
import { PrismaService } from '../../../shared/prisma/prisma.service.js'
import { startPostgres, type RunningPostgres } from '../../../test/postgres-container.js'
import { DebtsModule } from '../debts.module.js'

let postgres: RunningPostgres
let app: INestApplication
let prisma: PrismaService

const iso = (fecha: Date) => fecha.toISOString().slice(0, 10)
const hoy = iso(new Date())
// Empezó hace diez días: nace sin cuotas saldadas —la primera vence en unas tres semanas— y
// se puede pagar hoy. Acá se prueban los pagos que se registran, no los que se dan por hechos.
const inicio = iso(new Date(Date.now() - 10 * 86_400_000))
const mes = hoy.slice(0, 7)

const tresCuotas = {
  name: 'Préstamo corto',
  counterparty: 'Banco',
  principal: { minorUnits: '10000000', currency: 'CRC' },
  annualRate: '12',
  compounding: 'MONTHLY',
  termMonths: 3,
  startDate: inicio,
  kind: 'FRENCH',
  direction: 'BORROWED',
  budgetBucket: 'necesidades',
}

const http = () => request(app.getHttpServer())
const pagar = (id: string, date: string) =>
  http()
    .post(`/api/v1/debts/${id}/payments`)
    .send({ date, paymentAccountCode: '1101', categoryId: 'cat-prestamos' })

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

  await prisma.category.create({
    data: { id: 'cat-prestamos', bookId: LIBRO_DE_PRUEBA.bookId, name: 'Préstamos', kind: 'EXPENSE', accountCode: '6100' },
  })
}, 180_000)

afterAll(async () => {
  await app.close()
  await postgres.stop()
})

beforeEach(async () => {
  await prisma.debtPayment.deleteMany({ where: {} })
  await prisma.debt.deleteMany({ where: {} })
  await prisma.journalLine.deleteMany({ where: {} })
  await prisma.journalEntry.deleteMany({ where: {} })
  await prisma.movement.deleteMany({ where: {} })
  await prisma.accountingPeriod.deleteMany({ where: {} })
})

describe('POST /api/v1/debts/:id/payments', () => {
  it('paga la cuota: el gasto queda en la contabilidad y la tabla la marca pagada', async () => {
    const { body: deuda } = await http().post('/api/v1/debts').send(tresCuotas)

    const pago = await pagar(deuda.id, hoy)

    expect(pago.status).toBe(201)
    expect(pago.body.outstanding.minorUnits).toBe('6699779')
    const movimientos = await prisma.movement.findMany({ where: {} })
    expect(movimientos).toHaveLength(1)
    expect(movimientos[0]).toMatchObject({ amountMinor: 3_400_221n, paymentAccountCode: '1101' })

    const tabla = await http().get(`/api/v1/debts/${deuda.id}/schedule`)
    expect(tabla.body.installments[0]).toMatchObject({ status: 'PAID', paidOn: hoy, withMovement: true })
    expect(tabla.body.installments[1]).toMatchObject({ status: 'PENDING', paidOn: null })
  })

  it('con el mes cerrado no queda ni el gasto ni el pago', async () => {
    const { body: deuda } = await http().post('/api/v1/debts').send(tresCuotas)
    await prisma.accountingPeriod.create({
      data: { bookId: LIBRO_DE_PRUEBA.bookId, period: mes, status: 'CLOSED', closedAt: new Date() },
    })

    const pago = await pagar(deuda.id, hoy)

    // 409 es el contrato de la contabilidad para un mes cerrado.
    expect(pago.status).toBe(409)
    expect(await prisma.movement.count({ where: {} })).toBe(0)
    expect(await prisma.debtPayment.count({ where: {} })).toBe(0)
  })
})

describe('DELETE /api/v1/debts/:id/payments/last', () => {
  it('deshace el pago y anula su gasto', async () => {
    const { body: deuda } = await http().post('/api/v1/debts').send(tresCuotas)
    await pagar(deuda.id, hoy)

    const deshecho = await http().delete(`/api/v1/debts/${deuda.id}/payments/last`)

    expect(deshecho.status).toBe(200)
    expect(deshecho.body.outstanding.minorUnits).toBe('10000000')
    const [movimiento] = await prisma.movement.findMany({ where: {} })
    expect(movimiento?.status).toBe('VOIDED')
    // Una sola vez: deshacer desde la deuda anula el gasto, y contabilidad avisa; si el aviso
    // volviera a deshacer el pago, el registro contaría la misma anulación dos veces.
    const anulaciones = await prisma.auditLog.count({
      where: { entity: 'deuda', entityId: deuda.id, action: 'anular' },
    })
    expect(anulaciones).toBe(1)
  })
})

describe('POST /api/v1/debts/:id/payments/settled', () => {
  it('salda la cuota sin tocar la contabilidad', async () => {
    const { body: deuda } = await http().post('/api/v1/debts').send(tresCuotas)

    const saldada = await http().post(`/api/v1/debts/${deuda.id}/payments/settled`).send({ date: hoy })

    expect(saldada.status).toBe(201)
    expect(await prisma.movement.count({ where: {} })).toBe(0)
    const tabla = await http().get(`/api/v1/debts/${deuda.id}/schedule`)
    expect(tabla.body.installments[0]).toMatchObject({ status: 'PAID', withMovement: false })
  })
})

describe('anular desde Movimientos el gasto de una cuota', () => {
  const anular = (movementId: string) => http().post(`/api/v1/movements/${movementId}/void`)
  const gastoDe = async (debtId: string, cuota: number) =>
    (await prisma.debtPayment.findFirstOrThrow({ where: { debtId, installmentNumber: cuota } })).movementId!

  it('deshace el pago de la cuota: la deuda y el libro vuelven a decir lo mismo', async () => {
    const { body: deuda } = await http().post('/api/v1/debts').send(tresCuotas)
    await pagar(deuda.id, hoy)

    const anulado = await anular(await gastoDe(deuda.id, 1))

    expect(anulado.status).toBe(200)
    const { body: despues } = await http().get(`/api/v1/debts/${deuda.id}`)
    expect(despues.outstanding.minorUnits).toBe('10000000')
    expect(await prisma.debtPayment.count({ where: {} })).toBe(0)
  })

  // Los pagos van en orden: deshacer la cuota 1 con la 2 pagada dejaría una tabla sin sentido.
  it('no deja anular el gasto de una cuota que no es la última pagada', async () => {
    const { body: deuda } = await http().post('/api/v1/debts').send(tresCuotas)
    await pagar(deuda.id, hoy)
    await pagar(deuda.id, hoy)
    const primero = await gastoDe(deuda.id, 1)

    const anulado = await anular(primero)

    expect(anulado.status).toBe(409)
    expect((await prisma.movement.findUniqueOrThrow({ where: { id: primero } })).status).toBe('ACTIVE')
    expect(await prisma.debtPayment.count({ where: {} })).toBe(2)
  })

  it('un gasto que no pagó ninguna cuota se anula como siempre', async () => {
    const { body: deuda } = await http().post('/api/v1/debts').send(tresCuotas)
    await http().post(`/api/v1/debts/${deuda.id}/payments/settled`).send({ date: hoy })
    const suelto = await http().post('/api/v1/movements').send({
      date: hoy,
      kind: 'EXPENSE',
      categoryId: 'cat-prestamos',
      counterparty: 'Otro',
      amount: { minorUnits: '100', currency: 'CRC' },
      paymentAccountCode: '1101',
    })

    expect((await anular(suelto.body.id)).status).toBe(200)
    expect(await prisma.debtPayment.count({ where: {} })).toBe(1)
  })
})
