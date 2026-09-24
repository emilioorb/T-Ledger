import { conElCandadoRetenido } from '../../../test/candado-retenido.js'
import { EventEmitterModule } from '@nestjs/event-emitter'
import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AllExceptionsFilter } from '../../../shared/http/all-exceptions.filter.js'
import { PrismaService } from '../../../shared/prisma/prisma.service.js'
import { startPostgres, type RunningPostgres } from '../../../test/postgres-container.js'
import { AccountingModule } from '../accounting.module.js'
import { entrarEnLibroDePrueba } from '../../../shared/libro/libro-de-prueba.js'

let postgres: RunningPostgres
let app: INestApplication
let prisma: PrismaService
let categoriaId: string

const BASE = '/api/v1'

const get = (path: string) => request(app.getHttpServer()).get(`${BASE}${path}`)
const post = (path: string, body?: object) =>
  body === undefined
    ? request(app.getHttpServer()).post(`${BASE}${path}`)
    : request(app.getHttpServer()).post(`${BASE}${path}`).send(body)
const patch = (path: string, body: object) =>
  request(app.getHttpServer()).patch(`${BASE}${path}`).send(body)

const nuevoMovimiento = (overrides: Record<string, unknown> = {}) => ({
  date: '2026-09-16',
  kind: 'EXPENSE',
  counterparty: 'Proveedor',
  amount: { minorUnits: '2000000', currency: 'CRC' },
  paymentAccountCode: '1101',
  categoryId: categoriaId,
  ...overrides,
})

const crear = async (overrides: Record<string, unknown> = {}) =>
  (await post('/movements', nuevoMovimiento(overrides)).expect(201)).body as { id: string }

const mayorDe = async (account: string) =>
  (
    await get(
      `/reports/ledger?account=${account}&currency=CRC&from=2026-09-01&to=2026-09-30`,
    ).expect(200)
  ).body as { rows: unknown[]; closingBalance: { minorUnits: string } }

// Determinista: el cierre de agosto toma el candado del libro primero, y el pedido llega mientras
// lo tiene. Con la regla leída afuera, el pedido veía el mes abierto y asentaba en uno ya cerrado.
const mientrasSeCierraAgosto = (pedido: () => request.Test) =>
  conElCandadoRetenido(
    prisma,
    1,
    async () => pedido(),
    () =>
      prisma.client.accountingPeriod.create({
        data: { bookId: prisma.libro, period: '2026-08', status: 'CLOSED', closedAt: new Date() },
      }),
  )

// Este test no tiene nada que decir sobre libros, pero toda consulta necesita uno:
// sin contexto la extensión de Prisma corta, que es exactamente lo que queremos.
beforeEach(entrarEnLibroDePrueba)

beforeAll(async () => {
  entrarEnLibroDePrueba()
  postgres = await startPostgres()
  const moduleRef = await Test.createTestingModule({ imports: [EventEmitterModule.forRoot(), AccountingModule] })
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

  categoriaId = (
    await post('/categories', { name: 'Software', kind: 'EXPENSE', accountCode: '6100' }).expect(
      201,
    )
  ).body.id
})

describe('editar un movimiento', () => {
  it('cambiar el monto revierte el asiento vigente y emite uno nuevo', async () => {
    const movimiento = await crear()

    await patch(`/movements/${movimiento.id}`, {
      amount: { minorUnits: '3000000', currency: 'CRC' },
    }).expect(200)

    const mayor = await mayorDe('6100')
    expect(mayor.rows).toHaveLength(3)
    expect(mayor.closingBalance.minorUnits).toBe('3000000')
  })

  it('cambiar solo la contraparte no toca fecha, monto ni categoría', async () => {
    const movimiento = await crear()

    const response = await patch(`/movements/${movimiento.id}`, {
      counterparty: 'Otro proveedor',
    }).expect(200)

    expect(response.body).toMatchObject({
      counterparty: 'Otro proveedor',
      date: '2026-09-16',
      categoryId: categoriaId,
      amount: { minorUnits: '2000000', currency: 'CRC' },
    })
  })

  it('editar un movimiento de un mes cerrado responde 409', async () => {
    const movimiento = await crear({ date: '2026-08-15' })
    await post('/periods/2026-08/close').expect(200)

    const response = await patch(`/movements/${movimiento.id}`, { counterparty: 'Otro' })

    expect(response.status).toBe(409)
  })

  // El doble `assertOpen`: el mes de donde sale y el mes al que va.
  it('mover un movimiento hacia un mes cerrado responde 409', async () => {
    await post('/periods/2026-08/close').expect(200)
    const movimiento = await crear()

    const response = await patch(`/movements/${movimiento.id}`, { date: '2026-08-15' })

    expect(response.status).toBe(409)
  })

  it('un movimiento anulado no se edita', async () => {
    const movimiento = await crear()
    await post(`/movements/${movimiento.id}/void`).expect(200)

    const response = await patch(`/movements/${movimiento.id}`, { counterparty: 'Otro' })

    expect(response.status).toBe(409)
  })

  it('editar uno que no existe responde 404', async () => {
    const response = await patch('/movements/00000000-0000-0000-0000-000000000000', {
      counterparty: 'Otro',
    })

    expect(response.status).toBe(404)
  })
})

describe('un movimiento y su asiento se guardan juntos', () => {
  it('si el asiento no se puede emitir, el movimiento no queda guardado', async () => {
    const response = await post('/movements', nuevoMovimiento({ paymentAccountCode: '9999' }))

    expect(response.status).toBe(422)
    expect(await prisma.movement.count()).toBe(0)
    expect(await prisma.journalEntry.count()).toBe(0)
  })

  it('si el asiento falla al editar, el movimiento conserva lo que tenía', async () => {
    const movimiento = await crear()

    const response = await patch(`/movements/${movimiento.id}`, { paymentAccountCode: '9999' })

    expect(response.status).toBe(422)
    const guardado = await prisma.movement.findUnique({ where: { id: movimiento.id } })
    expect(guardado?.paymentAccountCode).toBe('1101')
    expect(await prisma.journalEntry.count()).toBe(1)
  })
})

describe('el guardián de período', () => {
  it('un mes cerrado no acepta asientos nuevos, y reabrirlo los vuelve a aceptar', async () => {
    await post('/periods/2026-08/close').expect(200)

    const rechazado = await post('/movements', nuevoMovimiento({ date: '2026-08-15' }))
    expect(rechazado.status).toBe(409)

    await post('/periods/2026-08/reopen').expect(200)
    await post('/movements', nuevoMovimiento({ date: '2026-08-15' })).expect(201)
  })

  it('un mes abierto acepta asientos aunque el anterior esté cerrado', async () => {
    await post('/periods/2026-08/close').expect(200)

    await post('/movements', nuevoMovimiento()).expect(201)
  })

  it('volver a anular lo ya anulado en un mes que se cerró después responde 200', async () => {
    const movimiento = await crear({ date: '2026-08-15' })
    await post(`/movements/${movimiento.id}/void`).expect(200)
    await post('/periods/2026-08/close').expect(200)

    await post(`/movements/${movimiento.id}/void`).expect(200)
  })

  it('anular en un mes cerrado también se frena', async () => {
    const movimiento = await crear({ date: '2026-08-15' })
    await post('/periods/2026-08/close').expect(200)

    expect((await post(`/movements/${movimiento.id}/void`)).status).toBe(409)
  })
})

// Dos personas sobre el mismo movimiento, de verdad en paralelo: las reglas se leen dentro del
// candado del libro, así que la segunda ve lo que dejó la primera (ADR-006).
describe('dos escritores sobre el mismo movimiento', () => {
  const version = async (id: string) => ((await get(`/movements/${id}`).expect(200)).body as { version: number }).version

  it('dos ediciones con la misma versión: una guarda y la otra recibe 409', async () => {
    const movimiento = await crear()
    const leida = await version(movimiento.id)

    const respuestas = await conElCandadoRetenido(prisma, 2, () =>
      Promise.all([
        patch(`/movements/${movimiento.id}`, { counterparty: 'Primera', version: leida }),
        patch(`/movements/${movimiento.id}`, { counterparty: 'Segunda', version: leida }),
      ]),
    )

    expect(respuestas.map((r) => r.status).sort()).toEqual([200, 409])
    expect(respuestas.find((r) => r.status === 409)?.body.error.code).toBe('EDITADO_POR_OTRO')
    expect(await prisma.journalEntry.count()).toBe(3)
  })

  it('dos anulaciones a la vez dejan una sola reversión', async () => {
    const movimiento = await crear()
    const leida = await version(movimiento.id)

    const respuestas = await conElCandadoRetenido(prisma, 2, () =>
      Promise.all([
        post(`/movements/${movimiento.id}/void`, { version: leida }),
        post(`/movements/${movimiento.id}/void`, { version: leida }),
      ]),
    )

    expect(respuestas.map((r) => r.status)).toEqual([200, 200])
    expect(await prisma.journalEntry.count()).toBe(2)
    expect((await mayorDe('6100')).closingBalance.minorUnits).toBe('0')
  })

  it('la respuesta trae la versión nueva: con ella se puede volver a editar', async () => {
    const movimiento = await crear()
    const primera = await patch(`/movements/${movimiento.id}`, { counterparty: 'Primera', version: await version(movimiento.id) })
    const segunda = await patch(`/movements/${movimiento.id}`, { counterparty: 'Segunda', version: primera.body.version })
    const anulado = await post(`/movements/${movimiento.id}/void`, { version: segunda.body.version })

    expect([primera.status, segunda.status, anulado.status]).toEqual([200, 200, 200])
    expect(anulado.body.version).toBe(await version(movimiento.id))
  })

  it('una edición con una versión vieja no guarda', async () => {
    const movimiento = await crear()
    const leida = await version(movimiento.id)
    await patch(`/movements/${movimiento.id}`, { counterparty: 'Primera' }).expect(200)

    const response = await patch(`/movements/${movimiento.id}`, { counterparty: 'Segunda', version: leida })

    expect(response.status).toBe(409)
    expect((await get(`/movements/${movimiento.id}`).expect(200)).body.counterparty).toBe('Primera')
  })

  it('editar mientras el mes se cierra: espera al cierre y recibe «mes cerrado»', async () => {
    const movimiento = await crear({ date: '2026-08-15' })

    const response = await mientrasSeCierraAgosto(() => patch(`/movements/${movimiento.id}`, { counterparty: 'Tarde' }))

    expect(response.status).toBe(409)
    expect(await prisma.journalEntry.count()).toBe(1)
  })
})

describe('dar de alta mientras el mes se cierra', () => {
  it('un movimiento espera al cierre y recibe «mes cerrado»', async () => {
    const response = await mientrasSeCierraAgosto(() => post('/movements', nuevoMovimiento({ date: '2026-08-15' })))

    expect(response.status).toBe(409)
    expect(await prisma.movement.count()).toBe(0)
  })

  it('un asiento manual espera al cierre y recibe «mes cerrado»', async () => {
    const response = await mientrasSeCierraAgosto(() =>
      post('/journal-entries', {
        date: '2026-08-15',
        description: 'Aporte',
        lines: [
          { accountCode: '1101', amount: { minorUnits: '1000000', currency: 'CRC' }, side: 'DEBIT' },
          { accountCode: '3110', amount: { minorUnits: '1000000', currency: 'CRC' }, side: 'CREDIT' },
        ],
      }),
    )

    expect(response.status).toBe(409)
    expect(await prisma.journalEntry.count()).toBe(0)
  })
})

// Al revés que los de arriba: el movimiento sin asiento entra primero, con el candado tomado, y el
// cierre llega mientras lo tiene. Con los bloqueos calculados afuera, el cierre veía el mes limpio
// y cerraba con un movimiento sin asentar adentro.
describe('cerrar mientras entra un movimiento', () => {
  it('el cierre espera, ve el movimiento sin asiento y no cierra', async () => {
    const cierre = await conElCandadoRetenido(
      prisma,
      1,
      async () => post('/periods/2026-08/close'),
      () =>
        prisma.client.movement.create({
          data: {
            bookId: prisma.libro,
            id: '00000000-0000-7000-8000-00000000c1e7',
            date: new Date('2026-08-15T00:00:00.000Z'),
            kind: 'EXPENSE',
            categoryId: categoriaId,
            counterparty: 'Sin asiento',
            amountMinor: 1_000n,
            currency: 'CRC',
            status: 'ACTIVE',
          },
        }),
    )

    expect(cierre.status).toBe(422)
    expect(await prisma.accountingPeriod.count({ where: { period: '2026-08', status: 'CLOSED' } })).toBe(0)
  })
})

