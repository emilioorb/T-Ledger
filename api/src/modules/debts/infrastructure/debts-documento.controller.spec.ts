import { EventEmitterModule } from '@nestjs/event-emitter'
import { readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
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

// Los documentos de este test caen en una carpeta temporal: el almacenamiento se elige al
// arrancar el módulo, así que la variable va antes de construirlo.
const CARPETA = join(tmpdir(), `documentos-${Date.now()}`)

const deuda = {
  name: 'CONAPE',
  counterparty: 'CONAPE',
  principal: { minorUnits: '10000000', currency: 'CRC' },
  annualRate: '12',
  compounding: 'MONTHLY',
  termMonths: 3,
  startDate: '2030-01-15',
  kind: 'FRENCH',
  direction: 'BORROWED',
  budgetBucket: 'deudas',
}

const PDF = Buffer.from('%PDF-1.4\n%contrato de prueba\n')

beforeEach(entrarEnLibroDePrueba)

beforeAll(async () => {
  process.env.ARCHIVOS_DIR = CARPETA
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
}, 180_000)

afterAll(async () => {
  await app.close()
  await postgres.stop()
  await rm(CARPETA, { recursive: true, force: true })
})

describe('el documento de una deuda', () => {
  it('se sube, se ve y se quita', async () => {
    const { body: creada } = await request(app.getHttpServer()).post('/api/v1/debts').send(deuda)
    expect(creada.hasDocument).toBe(false)

    const subida = await request(app.getHttpServer())
      .post(`/api/v1/debts/${creada.id}/document`)
      .attach('archivo', PDF, { filename: 'contrato.pdf', contentType: 'application/pdf' })
    expect(subida.status).toBe(200)
    expect(subida.body.hasDocument).toBe(true)

    const ver = await request(app.getHttpServer()).get(`/api/v1/debts/${creada.id}/document`)
    expect(ver.status).toBe(302)

    const quitada = await request(app.getHttpServer()).delete(`/api/v1/debts/${creada.id}/document`)
    expect(quitada.body.hasDocument).toBe(false)
  })

  it('con una versión vieja no lo sube ni lo apunta', async () => {
    const { body: creada } = await request(app.getHttpServer()).post('/api/v1/debts').send(deuda)
    await request(app.getHttpServer()).patch(`/api/v1/debts/${creada.id}`).send({ name: 'Editada' }).expect(200)

    const subida = await request(app.getHttpServer())
      .post(`/api/v1/debts/${creada.id}/document`)
      .field('version', String(creada.version))
      .attach('archivo', PDF, { filename: 'contrato.pdf', contentType: 'application/pdf' })

    expect(subida.status).toBe(409)
    expect((await request(app.getHttpServer()).get(`/api/v1/debts/${creada.id}`)).body.hasDocument).toBe(false)
    const carpeta = join(CARPETA, 'libros', LIBRO_DE_PRUEBA.bookId, 'documentos', 'deudas')
    const archivos = await readdir(carpeta).catch(() => [])
    expect(archivos.some((nombre) => nombre.startsWith(creada.id))).toBe(false)
  })

  it('no acepta lo que no es una foto o un PDF', async () => {
    const { body: creada } = await request(app.getHttpServer()).post('/api/v1/debts').send(deuda)

    const subida = await request(app.getHttpServer())
      .post(`/api/v1/debts/${creada.id}/document`)
      .attach('archivo', Buffer.from('<html></html>'), { filename: 'x.html', contentType: 'text/html' })

    expect(subida.status).toBe(400)
  })
})

describe('borrar una deuda con contrato', () => {
  it('se lleva también el archivo del contrato', async () => {
    const { body: creada } = await request(app.getHttpServer()).post('/api/v1/debts').send(deuda)
    await request(app.getHttpServer())
      .post(`/api/v1/debts/${creada.id}/document`)
      .attach('archivo', PDF, { filename: 'contrato.pdf', contentType: 'application/pdf' })
    const carpeta = join(CARPETA, 'libros', LIBRO_DE_PRUEBA.bookId, 'documentos', 'deudas')
    expect((await readdir(carpeta)).some((nombre) => nombre.startsWith(creada.id))).toBe(true)

    await request(app.getHttpServer()).delete(`/api/v1/debts/${creada.id}`).expect(204)

    expect((await readdir(carpeta)).some((nombre) => nombre.startsWith(creada.id))).toBe(false)
  })
})
