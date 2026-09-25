import { EventEmitterModule } from '@nestjs/event-emitter'
import type { INestApplication } from '@nestjs/common'
import { Global, Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AllExceptionsFilter } from '../../../shared/http/all-exceptions.filter.js'
import { entrarEnLibro } from '../../../shared/libro/libro-context.js'
import { LIBRO_DE_PRUEBA } from '../../../shared/libro/libro-de-prueba.js'
import { PrismaService } from '../../../shared/prisma/prisma.service.js'
import { startPostgres, type RunningPostgres } from '../../../test/postgres-container.js'
import { MARCA_DE_BIENVENIDA, type MarcaDeBienvenida } from '../../identity/domain/marca-de-bienvenida.port.js'
import { PermisoGuard } from '../../identity/infrastructure/permiso.guard.js'
import { RastroModule } from '../../auditoria/rastro.module.js'
import { OnboardingModule } from '../onboarding.module.js'

let postgres: RunningPostgres
let app: INestApplication
const vistas = new Set<string>()

// La marca de verdad vive en tablas de Better Auth; acá alcanza con un doble en memoria.
const marcaEnMemoria: MarcaDeBienvenida = {
  vista: async (userId) => vistas.has(userId),
  marcar: async (userId) => void vistas.add(userId),
}

@Global()
@Module({
  providers: [{ provide: MARCA_DE_BIENVENIDA, useValue: marcaEnMemoria }, { provide: APP_GUARD, useClass: PermisoGuard }],
  exports: [MARCA_DE_BIENVENIDA],
})
class IdentidadDePrueba {}

const BASE = '/api/v1/onboarding'
const pedir = {
  get: (path = '') => request(app.getHttpServer()).get(`${BASE}${path}`),
  post: (path: string, body: object = {}) => request(app.getHttpServer()).post(`${BASE}${path}`).send(body),
}

const comoDueno = () => entrarEnLibro(LIBRO_DE_PRUEBA)
const comoEditor = () => entrarEnLibro({ ...LIBRO_DE_PRUEBA, rol: 'editor' })

beforeEach(() => {
  comoDueno()
  vistas.clear()
})

beforeAll(async () => {
  comoDueno()
  postgres = await startPostgres()
  const moduleRef = await Test.createTestingModule({
    imports: [EventEmitterModule.forRoot(), IdentidadDePrueba, RastroModule, OnboardingModule],
  })
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
})

describe('estado', () => {
  it('el dueño que no la vio la tiene pendiente, con el libro en que se abrió', async () => {
    const { body } = await pedir.get().expect(200)
    expect(body).toEqual({ pending: true, bookId: LIBRO_DE_PRUEBA.bookId, steps: {} })
  })

  it('un editor nunca la tiene pendiente', async () => {
    comoEditor()
    const { body } = await pedir.get().expect(200)
    expect(body.pending).toBe(false)
  })

  it('empezar la marca, y empezar dos veces da 204 las dos', async () => {
    await pedir.post('/start').expect(204)
    await pedir.post('/start').expect(204)
    const { body } = await pedir.get().expect(200)
    expect(body.pending).toBe(false)
  })

  it('un editor no puede empezarla', async () => {
    comoEditor()
    await pedir.post('/start').expect(403)
  })
})
