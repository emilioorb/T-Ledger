import { EventEmitterModule } from '@nestjs/event-emitter'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { rm } from 'node:fs/promises'
import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AllExceptionsFilter } from '../../../shared/http/all-exceptions.filter.js'
import { PrismaService } from '../../../shared/prisma/prisma.service.js'
import { startPostgres, type RunningPostgres } from '../../../test/postgres-container.js'
import { AccountingModule } from '../accounting.module.js'
import { entrarEnLibroDePrueba } from '../../../shared/libro/libro-de-prueba.js'
import { conLibro, type ContextoDeLibro } from '../../../shared/libro/libro-context.js'
import { Money } from '../../../shared/kernel/money.js'
import { unwrap } from '../../../shared/kernel/result.js'
import { Account } from '../domain/account.js'
import { JournalEntry } from '../domain/journal-entry.js'
import { CHART_SEED } from './chart-seed.js'
import { PrismaAccountRepository } from './prisma-account.repository.js'
import { PrismaJournalRepository } from './prisma-journal.repository.js'

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

// Un PNG de un píxel, entero y válido. Con un `Buffer.from('x')` el test pasaría igual, pero
// entonces no estaría probando que un archivo de verdad sobrevive el viaje.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
)

const asientoValido = {
  date: '2026-09-16',
  description: 'Asiento manual',
  lines: [
    { accountCode: '6100', amount: { minorUnits: '100000', currency: 'CRC' }, side: 'DEBIT' },
    { accountCode: '1101', amount: { minorUnits: '100000', currency: 'CRC' }, side: 'CREDIT' },
  ],
}

// Este test no tiene nada que decir sobre libros, pero toda consulta necesita uno:
// sin contexto la extensión de Prisma corta, que es exactamente lo que queremos.
beforeEach(entrarEnLibroDePrueba)

// Los comprobantes de este test caen en una carpeta temporal y no en la de desarrollo: se
// escribe antes de construir el módulo porque el almacenamiento se elige al arrancar.
const CARPETA_DE_ARCHIVOS = join(tmpdir(), `comprobantes-${Date.now()}`)

beforeAll(async () => {
  process.env.ARCHIVOS_DIR = CARPETA_DE_ARCHIVOS
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
  await rm(CARPETA_DE_ARCHIVOS, { recursive: true, force: true })
  await app.close()
  await postgres.stop()
})

beforeEach(async () => {
  await prisma.journalLine.deleteMany()
  await prisma.journalEntry.deleteMany()
  await prisma.movement.deleteMany()
  await prisma.category.deleteMany()
  await prisma.accountingPeriod.deleteMany()
  await prisma.exchangeRate.deleteMany()
})

// La tasa se publica un día y rige hasta la siguiente publicación.
const publicarTasa = (publishedAt: string, value: string) =>
  prisma.exchangeRate.create({
    data: { indicator: '317', value, publishedAt: new Date(`${publishedAt}T00:00:00.000Z`) },
  })

// Un aporte en colones y su conversión completa a dólares el mismo día.
const aportarYConvertir = async () => {
  await post('/journal-entries', {
    date: '2026-09-16',
    description: 'Aporte inicial',
    lines: [
      { accountCode: '1101', amount: { minorUnits: '50800000', currency: 'CRC' }, side: 'DEBIT' },
      { accountCode: '3110', amount: { minorUnits: '50800000', currency: 'CRC' }, side: 'CREDIT' },
    ],
  }).expect(201)

  await post('/journal-entries', {
    date: '2026-09-16',
    description: 'Compra de dólares',
    lines: [
      { accountCode: '1190', amount: { minorUnits: '50800000', currency: 'CRC' }, side: 'DEBIT' },
      { accountCode: '1101', amount: { minorUnits: '50800000', currency: 'CRC' }, side: 'CREDIT' },
      { accountCode: '1102', amount: { minorUnits: '100000', currency: 'USD' }, side: 'DEBIT' },
      { accountCode: '1190', amount: { minorUnits: '100000', currency: 'USD' }, side: 'CREDIT' },
    ],
  }).expect(201)
}

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
    const categoria = await crearCategoria({
      name: 'Sin mapear',
      kind: 'EXPENSE',
      accountCode: null,
    })

    const response = await crearMovimientoRaw({ categoryId: categoria.id })

    expect(response.status).toBe(201)
    expect(response.body.posted).toBe(false)
    expect(response.body.journalEntryId).toBeNull()
  })

  it('el estado de situación cuadra', async () => {
    await crearMovimientoSimple()

    const situacion = await get('/reports/financial-position?currency=CRC&at=2026-09-30').expect(
      200,
    )

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
      categoryId: (await crearCategoria({ name: 'Agosto', kind: 'EXPENSE', accountCode: '6100' }))
        .id,
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
      categoryId: (await crearCategoria({ name: 'Software', kind: 'EXPENSE', accountCode: '6100' }))
        .id,
      date: '2026-08-15',
    })

    expect(response.status).toBe(409)
    expect(response.body.error.code).toBe('CONFLICT')
  })

  it('anular un movimiento de un período cerrado también responde 409', async () => {
    const categoria = await crearCategoria({
      name: 'Software',
      kind: 'EXPENSE',
      accountCode: '6100',
    })
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
        {
          accountCode: '1101',
          amount: { minorUnits: '50800000', currency: 'CRC' },
          side: 'CREDIT',
        },
        { accountCode: '1102', amount: { minorUnits: '100000', currency: 'USD' }, side: 'DEBIT' },
        { accountCode: '1190', amount: { minorUnits: '100000', currency: 'USD' }, side: 'CREDIT' },
      ],
    })

    expect(response.status).toBe(201)
  })

  it('la búsqueda filtra por contraparte en la base, no en la página cargada', async () => {
    await crearMovimientoSimple()

    const encontrados = await get('/movements?search=veedo').expect(200)
    const vacios = await get('/movements?search=zzz').expect(200)

    expect(encontrados.body.pagination.totalItems).toBe(1)
    expect(vacios.body.pagination.totalItems).toBe(0)
  })

  // `summary` tiene que resolverse como ruta propia y no como el identificador de un
  // movimiento. Si alguien la declara debajo de `:id`, esto responde 404 diciendo que el
  // movimiento «summary» no existe, y la barra de composición se queda vacía sin explicar por
  // qué.
  it('el resumen por categoría suma el filtro entero y deja afuera los anulados', async () => {
    const software = await crearCategoria({
      name: 'Software',
      kind: 'EXPENSE',
      accountCode: '6100',
    })
    const mercado = await crearCategoria({ name: 'Mercado', kind: 'EXPENSE', accountCode: '6100' })

    await crearMovimientoRaw({ categoryId: software.id }).expect(201)
    await crearMovimientoRaw({
      categoryId: mercado.id,
      amount: { minorUnits: '500000', currency: 'CRC' },
    }).expect(201)
    const anulado = (await crearMovimientoRaw({
      categoryId: software.id,
      amount: { minorUnits: '9900000', currency: 'CRC' },
    }).expect(201)) as { body: { id: string } }
    await post(`/movements/${anulado.body.id}/void`).expect(200)

    const resumen = await get('/movements/summary?from=2026-09-01&to=2026-09-30').expect(200)

    expect(resumen.body).toEqual([
      { categoryId: software.id, total: { minorUnits: '2000000', currency: 'CRC' } },
      { categoryId: mercado.id, total: { minorUnits: '500000', currency: 'CRC' } },
    ])
  })

  it('el resumen respeta los mismos filtros que la lista', async () => {
    const categoria = await crearCategoria({
      name: 'Software',
      kind: 'EXPENSE',
      accountCode: '6100',
    })
    await crearMovimientoRaw({ categoryId: categoria.id }).expect(201)

    const fuera = await get('/movements/summary?from=2026-08-01&to=2026-08-31').expect(200)
    const porTexto = await get('/movements/summary?search=zzz').expect(200)

    expect(fuera.body).toEqual([])
    expect(porTexto.body).toEqual([])
  })

  // El comprobante ya no es un campo de texto con una URL: es un archivo que se sube. Lo que
  // este test fija es que la clave la arme el servidor y lleve el libro adelante, porque eso
  // es lo que impide que un movimiento apunte al comprobante de otra familia.
  it('sube el comprobante de un movimiento y lo deja apuntado', async () => {
    const { id } = await crearMovimientoSimple()

    const respuesta = await request(app.getHttpServer())
      .post(`${BASE}/movements/${id}/receipt`)
      .attach('archivo', PNG, { filename: 'factura.png', contentType: 'image/png' })
      .expect(200)

    expect(respuesta.body.receiptKey).toMatch(/^libros\/lib_test\/comprobantes\//)
    // Sigue contabilizado: adjuntar una foto no toca el asiento.
    expect(respuesta.body.posted).toBe(true)
  })

  it('un ejecutable no es un comprobante', async () => {
    const { id } = await crearMovimientoSimple()

    await request(app.getHttpServer())
      .post(`${BASE}/movements/${id}/receipt`)
      .attach('archivo', Buffer.from('MZ'), {
        filename: 'virus.exe',
        contentType: 'application/x-msdownload',
      })
      .expect(400)

    const movimiento = await get(`/movements/${id}`).expect(200)
    expect(movimiento.body.receiptKey).toBeNull()
  })

  it('quitar el comprobante lo desapunta', async () => {
    const { id } = await crearMovimientoSimple()
    await request(app.getHttpServer())
      .post(`${BASE}/movements/${id}/receipt`)
      .attach('archivo', PNG, { filename: 'factura.png', contentType: 'image/png' })
      .expect(200)

    const respuesta = await del(`/movements/${id}/receipt`).expect(200)

    expect(respuesta.body.receiptKey).toBeNull()
  })

  it('pedir el comprobante de un movimiento que no lo tiene responde 404', async () => {
    const { id } = await crearMovimientoSimple()

    await get(`/movements/${id}/receipt`).expect(404)
  })

  it('el patrimonio consolidado separa lo que hizo el tipo de cambio', async () => {
    await publicarTasa('2026-09-16', '508')
    await publicarTasa('2026-09-21', '443.27')
    await aportarYConvertir()

    const patrimonio = await get('/reports/net-worth?at=2026-09-30').expect(200)

    // ₡508 000 convertidos a $1 000 valen hoy ₡443 270, y los ₡64 730 que faltan son
    // exactamente lo que se movió la tasa, no algo que Emilio hizo.
    expect(patrimonio.body.netWorth.minorUnits).toBe('44327000')
    expect(patrimonio.body.equity.minorUnits).toBe('50800000')
    expect(patrimonio.body.exchangeDifference.minorUnits).toBe('-6473000')
    expect(patrimonio.body.balances).toBe(true)
    expect(patrimonio.body.currency).toBe('CRC')
    expect(patrimonio.body.rate).toBeUndefined()

    const dolares = patrimonio.body.byCurrency.find(
      (row: { currency: string }) => row.currency === 'USD',
    )
    expect(dolares.rate).toBe('443.27')
    // El desglose muestra los dólares que se tienen, no el cero que deja el puente.
    expect(dolares.netWorthNative.minorUnits).toBe('100000')
    expect(dolares.netWorthTranslated.minorUnits).toBe('44327000')
  })

  it('el patrimonio de un libro no suma los asientos de otro libro', async () => {
    const ajeno: ContextoDeLibro = { bookId: 'lib_ajeno', userId: 'usr_ajeno', rol: 'owner' }
    await prisma.clientSinFiltroDeLibro.book.create({
      data: { id: ajeno.bookId, name: 'Ajeno', slug: 'libro-ajeno-patrimonio', createdAt: new Date() },
    })
    try {
      await conLibro(ajeno, async () => {
        const cuentas = new PrismaAccountRepository(prisma)
        await cuentas.saveMany(CHART_SEED.map((props) => unwrap(Account.create(props))))
        const colones = Money.fromMinorUnits(77_000_00n, 'CRC')
        const gasto = unwrap(
          JournalEntry.create(
            {
              id: 'asiento-ajeno',
              date: new Date('2026-09-16T00:00:00.000Z'),
              description: 'Súper de otra familia',
              reference: null,
              lines: [
                { accountCode: '6100', amount: colones, side: 'DEBIT' },
                { accountCode: '1101', amount: colones, side: 'CREDIT' },
              ],
              sourceMovementId: null,
              reversesEntryId: null,
            },
            await cuentas.loadChart(),
          ),
        )
        await new PrismaJournalRepository(prisma, cuentas).save(gasto)
      })

      const patrimonio = await get('/reports/net-worth?at=2026-09-30').expect(200)

      expect(patrimonio.body.equity.minorUnits).toBe('0')
      expect(patrimonio.body.exchangeDifference.minorUnits).toBe('0')
    } finally {
      await prisma.clientSinFiltroDeLibro.book.delete({ where: { id: ajeno.bookId } })
    }
  })

  it('sin movimientos el patrimonio es cero y no pide tipo de cambio', async () => {
    const patrimonio = await get('/reports/net-worth?at=2026-09-30').expect(200)

    expect(patrimonio.body.netWorth.minorUnits).toBe('0')
    expect(patrimonio.body.balances).toBe(true)
  })

  it('sin tipo de cambio publicado el patrimonio no se inventa: responde 422', async () => {
    await aportarYConvertir()

    const response = await get('/reports/net-worth?at=2026-09-30')

    expect(response.status).toBe(422)
    expect(response.body.error.message).toContain('2026-09-30')
  })

  it('crear una cuenta con un código que ya existe responde 409 y no la pisa', async () => {
    const response = await post('/accounts', {
      code: '1101',
      name: 'Otra cosa',
      accountClass: 'ASSET',
    })

    expect(response.status).toBe(409)
    expect((await get('/accounts/1101').expect(200)).body.name).not.toBe('Otra cosa')
  })

  // Colgarle una hija la vuelve agrupadora y le deja el saldo adentro: el árbol lo cuenta
  // dos veces y nadie se entera hasta cuadrar a mano.
  it('no se le puede colgar una hija a una cuenta que ya tiene asientos', async () => {
    await crearMovimientoSimple()

    const response = await post('/accounts', {
      code: '110101',
      name: 'Caja chica',
      accountClass: 'ASSET',
      parentCode: '1101',
    })

    expect(response.status).toBe(422)
    expect(response.body.error.message).toContain('1101')
  })

  it('no existe forma de borrar un asiento', async () => {
    const entry = await post('/journal-entries', asientoValido).expect(201)

    expect((await del(`/journal-entries/${entry.body.id}`)).status).toBe(404)
  })
})
