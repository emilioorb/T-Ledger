import type { INestApplication } from '@nestjs/common'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AllExceptionsFilter } from '../../../shared/http/all-exceptions.filter.js'
import { PrismaService } from '../../../shared/prisma/prisma.service.js'
import { startPostgres, type RunningPostgres } from '../../../test/postgres-container.js'
import { AccountingModule } from '../../accounting/accounting.module.js'
import { BankingModule } from '../banking.module.js'
import { entrarEnLibroDePrueba } from '../../../shared/libro/libro-de-prueba.js'

let postgres: RunningPostgres
let app: INestApplication
let prisma: PrismaService
let cuentaId: string
let perfilId: string
let categoriaId: string

const BASE = '/api/v1'
const RANGO = 'from=2026-09-01&to=2026-09-30'

const CSV = [
  'Fecha,Descripcion,Referencia,Monto',
  '15/09/2026,SUPERMERCADO,REF1,-45000.00',
  '16/09/2026,NETFLIX,REF2,-5990.00',
  '',
].join('\n')

const get = (path: string) => request(app.getHttpServer()).get(`${BASE}${path}`)
const post = (path: string, body: object = {}) =>
  request(app.getHttpServer()).post(`${BASE}${path}`).send(body)

const importar = () =>
  request(app.getHttpServer())
    .post(`${BASE}/bank-statements`)
    .field('bankAccountId', cuentaId)
    .field('profileId', perfilId)
    .attach('file', Buffer.from(CSV, 'utf-8'), 'extracto.csv')
    .expect(201)

const lineasPendientes = async (): Promise<{ id: string; amount: { minorUnits: string } }[]> =>
  (await get(`/bank-accounts/${cuentaId}/reconciliation?${RANGO}`).expect(200)).body.lines

const crearMovimiento = async (
  minorUnits: string,
  date = '2026-09-15',
  paymentAccountCode = '1111',
) =>
  (
    await post('/movements', {
      date,
      kind: 'EXPENSE',
      categoryId: categoriaId,
      counterparty: 'SUPERMERCADO',
      amount: { minorUnits, currency: 'CRC' },
      paymentAccountCode,
    }).expect(201)
  ).body as { id: string }

// Este test no tiene nada que decir sobre libros, pero toda consulta necesita uno:
// sin contexto la extensión de Prisma corta, que es exactamente lo que queremos.
beforeEach(entrarEnLibroDePrueba)

beforeAll(async () => {
  entrarEnLibroDePrueba()
  postgres = await startPostgres()
  const moduleRef = await Test.createTestingModule({
    imports: [EventEmitterModule.forRoot(), AccountingModule, BankingModule],
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
  await prisma.bankLine.deleteMany()
  await prisma.bankStatement.deleteMany()
  await prisma.bankAccount.deleteMany()
  await prisma.importProfile.deleteMany()
  await prisma.journalLine.deleteMany()
  await prisma.journalEntry.deleteMany()
  await prisma.movement.deleteMany()
  await prisma.category.deleteMany()
  await prisma.accountingPeriod.deleteMany()

  perfilId = (
    await post('/import-profiles', {
      name: 'BAC CSV',
      delimiter: ',',
      encoding: 'utf-8',
      headerRows: 1,
      dateColumn: 0,
      dateFormat: 'DD/MM/YYYY',
      descriptionColumn: 1,
      referenceColumn: 2,
      amountColumn: 3,
      decimalSeparator: '.',
      thousandsSeparator: null,
    }).expect(201)
  ).body.id

  cuentaId = (
    await post('/bank-accounts', {
      name: 'BAC colones',
      accountCode: '1111',
      currency: 'CRC',
      profileId: perfilId,
    }).expect(201)
  ).body.id

  categoriaId = (
    await post('/categories', { name: 'Mercado', kind: 'EXPENSE', accountCode: '6100' }).expect(201)
  ).body.id
})

describe('conciliación', () => {
  it('sugiere el movimiento que coincide en monto y fecha', async () => {
    await importar()
    const movimiento = await crearMovimiento('4500000')

    const response = await get(`/bank-accounts/${cuentaId}/reconciliation?${RANGO}`).expect(200)

    expect(response.body.suggestions).toHaveLength(1)
    expect(response.body.suggestions[0]).toMatchObject({
      movementId: movimiento.id,
      reason: 'EXACT',
      ambiguous: false,
    })
  })

  it('confirmar deja la línea conciliada con su movimiento', async () => {
    await importar()
    const movimiento = await crearMovimiento('4500000')
    const [linea] = await lineasPendientes()

    await post(`/bank-lines/${linea!.id}/match`, { movementId: movimiento.id }).expect(200)

    const actualizada = await prisma.bankLine.findUnique({ where: { id: linea!.id } })
    expect(actualizada?.status).toBe('MATCHED')
    expect(actualizada?.movementId).toBe(movimiento.id)
  })

  it('confirmar dos líneas contra el mismo movimiento responde 409', async () => {
    await importar()
    const movimiento = await crearMovimiento('4500000')
    const [primera, segunda] = await lineasPendientes()

    await post(`/bank-lines/${primera!.id}/match`, { movementId: movimiento.id }).expect(200)
    const respuesta = await post(`/bank-lines/${segunda!.id}/match`, {
      movementId: movimiento.id,
    })

    expect(respuesta.status).toBe(409)
  })

  it('deshacer devuelve la línea a pendiente', async () => {
    await importar()
    const movimiento = await crearMovimiento('4500000')
    const [linea] = await lineasPendientes()
    await post(`/bank-lines/${linea!.id}/match`, { movementId: movimiento.id }).expect(200)

    await post(`/bank-lines/${linea!.id}/unmatch`).expect(200)

    const actualizada = await prisma.bankLine.findUnique({ where: { id: linea!.id } })
    expect(actualizada?.status).toBe('PENDING')
    expect(actualizada?.movementId).toBeNull()
  })

  it('ignorar saca la línea de pendientes sin crear nada', async () => {
    await importar()
    const [linea] = await lineasPendientes()

    await post(`/bank-lines/${linea!.id}/ignore`).expect(200)

    expect(await prisma.movement.count()).toBe(0)
    expect((await lineasPendientes()).length).toBe(1)
  })

  it('convertir una línea en movimiento crea el movimiento, su asiento y la concilia', async () => {
    await importar()
    const [linea] = await lineasPendientes()

    const response = await post(`/bank-lines/${linea!.id}/to-movement`, {
      categoryId: categoriaId,
    })

    expect(response.status).toBe(201)
    expect(await prisma.journalEntry.count()).toBe(1)

    const actualizada = await prisma.bankLine.findUnique({ where: { id: linea!.id } })
    expect(actualizada?.status).toBe('MATCHED')
    expect(actualizada?.movementId).toBe(response.body.movementId)
  })

  it('el movimiento creado toma la fecha, el monto y la cuenta de la línea', async () => {
    await importar()
    const [linea] = await lineasPendientes()

    await post(`/bank-lines/${linea!.id}/to-movement`, { categoryId: categoriaId }).expect(201)
    const movimiento = await prisma.movement.findFirst()

    expect(movimiento?.date.toISOString().slice(0, 10)).toBe('2026-09-15')
    expect(movimiento?.amountMinor).toBe(4_500_000n)
    expect(movimiento?.paymentAccountCode).toBe('1111')
    expect(movimiento?.kind).toBe('EXPENSE')
  })

  it('convertir una línea de un mes cerrado responde 409', async () => {
    await importar()
    const [linea] = await lineasPendientes()
    await post('/periods/2026-08/close').expect(200)
    await post('/periods/2026-09/close').expect(200)

    const response = await post(`/bank-lines/${linea!.id}/to-movement`, {
      categoryId: categoriaId,
    })

    expect(response.status).toBe(409)
  })

  it('una línea ya conciliada no se puede convertir otra vez', async () => {
    await importar()
    const [linea] = await lineasPendientes()
    await post(`/bank-lines/${linea!.id}/to-movement`, { categoryId: categoriaId }).expect(201)

    const segunda = await post(`/bank-lines/${linea!.id}/to-movement`, {
      categoryId: categoriaId,
    })

    expect(segunda.status).toBe(409)
  })

  it('confirmar contra un movimiento que no existe responde 404', async () => {
    await importar()
    const [linea] = await lineasPendientes()

    const respuesta = await post(`/bank-lines/${linea!.id}/match`, {
      movementId: '00000000-0000-0000-0000-000000000000',
    })

    expect(respuesta.status).toBe(404)
    expect((await lineasPendientes()).length).toBe(2)
  })

  it('confirmar contra un movimiento de otro monto responde 422', async () => {
    await importar()
    const movimiento = await crearMovimiento('9900000')
    const [linea] = await lineasPendientes()

    const respuesta = await post(`/bank-lines/${linea!.id}/match`, { movementId: movimiento.id })

    expect(respuesta.status).toBe(422)
    expect((await lineasPendientes()).length).toBe(2)
  })

  it('confirmar contra un movimiento pagado con otra cuenta responde 422', async () => {
    await importar()
    const movimiento = await crearMovimiento('4500000', '2026-09-15', '1101')
    const [linea] = await lineasPendientes()

    const respuesta = await post(`/bank-lines/${linea!.id}/match`, { movementId: movimiento.id })

    expect(respuesta.status).toBe(422)
    expect(respuesta.body.error.message).toContain('1101')
  })

  it('confirmar contra un movimiento anulado responde 422', async () => {
    await importar()
    const movimiento = await crearMovimiento('4500000')
    await post(`/movements/${movimiento.id}/void`).expect(200)
    const [linea] = await lineasPendientes()

    const respuesta = await post(`/bank-lines/${linea!.id}/match`, { movementId: movimiento.id })

    expect(respuesta.status).toBe(422)
  })

  it('con todo conciliado la diferencia entre libros y extracto es cero', async () => {
    await importar()
    for (const linea of await lineasPendientes()) {
      await post(`/bank-lines/${linea.id}/to-movement`, { categoryId: categoriaId }).expect(201)
    }

    const response = await get(`/bank-accounts/${cuentaId}/reconciliation?${RANGO}`).expect(200)

    expect(response.body.difference.minorUnits).toBe('0')
    expect(response.body.lines).toHaveLength(0)
  })

  // El mes siguiente es donde se veía: el saldo contable venía acumulado desde el inicio y
  // el del extracto acotado al rango, así que octubre arrancaba debiendo el saldo de setiembre.
  it('un mes sin movimiento tampoco arrastra la diferencia del mes anterior', async () => {
    await importar()
    for (const linea of await lineasPendientes()) {
      await post(`/bank-lines/${linea.id}/to-movement`, { categoryId: categoriaId }).expect(201)
    }

    const octubre = await get(
      `/bank-accounts/${cuentaId}/reconciliation?from=2026-10-01&to=2026-10-31`,
    ).expect(200)

    expect(octubre.body.difference.minorUnits).toBe('0')
    expect(octubre.body.ledgerMovement.minorUnits).toBe('0')
    expect(octubre.body.statementMovement.minorUnits).toBe('0')
  })
})

// Dos personas conciliando a la vez, de verdad en paralelo: la línea y el movimiento se miran
// dentro del candado del libro, y el índice único de la base es la segunda red (ADR-006).
describe('dos personas conciliando a la vez', () => {
  const DOS_IGUALES = [
    'Fecha,Descripcion,Referencia,Monto',
    '15/09/2026,SUPERMERCADO,REF-A,-45000.00',
    '17/09/2026,SUPERMERCADO,REF-B,-45000.00',
    '',
  ].join('\n')

  const importarDosIguales = () =>
    request(app.getHttpServer())
      .post(`${BASE}/bank-statements`)
      .field('bankAccountId', cuentaId)
      .field('profileId', perfilId)
      .attach('file', Buffer.from(DOS_IGUALES, 'utf-8'), 'extracto.csv')
      .expect(201)

  it('el mismo movimiento contra dos líneas: una gana y la otra recibe 409', async () => {
    await importarDosIguales()
    const movimiento = await crearMovimiento('4500000')
    const [primera, segunda] = await lineasPendientes()

    const respuestas = await Promise.all([
      post(`/bank-lines/${primera!.id}/match`, { movementId: movimiento.id }),
      post(`/bank-lines/${segunda!.id}/match`, { movementId: movimiento.id }),
    ])

    expect(respuestas.map((r) => r.status).sort()).toEqual([200, 409])
    expect(await prisma.bankLine.count({ where: { movementId: movimiento.id, status: 'MATCHED' } })).toBe(1)
  })

  it('la misma línea contra dos movimientos: queda uno', async () => {
    await importar()
    const uno = await crearMovimiento('4500000')
    const otro = await crearMovimiento('4500000')
    const [linea] = await lineasPendientes()

    const respuestas = await Promise.all([
      post(`/bank-lines/${linea!.id}/match`, { movementId: uno.id }),
      post(`/bank-lines/${linea!.id}/match`, { movementId: otro.id }),
    ])

    expect(respuestas.map((r) => r.status).sort()).toEqual([200, 409])
    const conciliada = await prisma.bankLine.findUniqueOrThrow({ where: { id: linea!.id } })
    expect([uno.id, otro.id]).toContain(conciliada.movementId)
  })
})

