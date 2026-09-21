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

let postgres: RunningPostgres
let app: INestApplication
let prisma: PrismaService
let cuentaId: string
let perfilId: string

const BASE = '/api/v1'

const CSV = [
  'Fecha,Descripcion,Referencia,Monto',
  '15/09/2026,SUPERMERCADO,REF1,-45000.50',
  '16/09/2026,SALARIO,REF2,1500000.00',
  '17/09/2026,NETFLIX,REF3,-5990.00',
  '',
].join('\n')

const post = (path: string, body: object) =>
  request(app.getHttpServer()).post(`${BASE}${path}`).send(body)

const subir = (contents: string, path = '/bank-statements') =>
  request(app.getHttpServer())
    .post(`${BASE}${path}`)
    .field('bankAccountId', cuentaId)
    .field('profileId', perfilId)
    .attach('file', Buffer.from(contents, 'utf-8'), 'extracto.csv')

beforeAll(async () => {
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

  const perfil = await post('/import-profiles', {
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
  perfilId = (perfil.body as { id: string }).id

  const cuenta = await post('/bank-accounts', {
    name: 'BAC colones',
    accountCode: '1111',
    currency: 'CRC',
    profileId: perfilId,
  }).expect(201)
  cuentaId = (cuenta.body as { id: string }).id
})

describe('importación de extractos', () => {
  it('la vista previa devuelve las líneas sin guardar nada', async () => {
    const response = await subir(CSV, '/bank-statements/preview')

    expect(response.status).toBe(200)
    expect(response.body.lines).toHaveLength(3)
    expect(response.body.lines[0].amount.minorUnits).toBe('-4500050')
    expect(await prisma.bankLine.count()).toBe(0)
    expect(await prisma.bankStatement.count()).toBe(0)
  })

  it('importar guarda las líneas y reporta cuántas entraron', async () => {
    const response = await subir(CSV)

    expect(response.status).toBe(201)
    expect(response.body).toMatchObject({ imported: 3, duplicated: 0 })
    expect(await prisma.bankLine.count()).toBe(3)
  })

  it('importar dos veces el mismo archivo no duplica', async () => {
    await subir(CSV).expect(201)
    const segunda = await subir(CSV)

    expect(segunda.body).toMatchObject({ imported: 0, duplicated: 3 })
    expect(await prisma.bankLine.count()).toBe(3)
  })

  it('un CSV que no coincide con el perfil responde 422 diciendo la fila', async () => {
    const response = await subir('Fecha,Desc,Ref,Monto\nno-es-fecha,X,,100\n')

    expect(response.status).toBe(422)
    expect(response.body.error.message).toContain('fila 2')
  })

  it('un archivo sin ninguna línea responde 422 y no crea el extracto', async () => {
    const response = await subir('Fecha,Desc,Ref,Monto\n')

    expect(response.status).toBe(422)
    expect(await prisma.bankStatement.count()).toBe(0)
  })

  it('la moneda de la cuenta bancaria es la de las líneas', async () => {
    await subir(CSV).expect(201)
    const linea = await prisma.bankLine.findFirst()

    expect(linea?.currency).toBe('CRC')
  })

  it('una cuenta bancaria que no existe responde 404', async () => {
    const response = await request(app.getHttpServer())
      .post(`${BASE}/bank-statements`)
      .field('bankAccountId', '01931b4e-0000-7000-8000-00000000dead')
      .field('profileId', perfilId)
      .attach('file', Buffer.from(CSV), 'extracto.csv')

    expect(response.status).toBe(404)
  })

  it('sin archivo adjunto responde 422', async () => {
    const response = await post('/bank-statements', {
      bankAccountId: cuentaId,
      profileId: perfilId,
    })

    expect(response.status).toBe(422)
  })
})
