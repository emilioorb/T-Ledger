import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AllExceptionsFilter } from '../../../shared/http/all-exceptions.filter.js'
import { entrarEnLibroDePrueba } from '../../../shared/libro/libro-de-prueba.js'
import { PrismaService } from '../../../shared/prisma/prisma.service.js'
import { startPostgres, type RunningPostgres } from '../../../test/postgres-container.js'
import { EnlacesDeInvitacion } from '../../identity/infrastructure/enlaces-de-invitacion.js'
import { InvitacionesALaAppUseCase } from '../application/invitaciones-a-la-app.use-case.js'
import { ResumenDeInstanciaUseCase } from '../application/resumen-de-instancia.use-case.js'
import { AdminController } from './admin.controller.js'
import { AdminGuard } from './admin.guard.js'

let postgres: RunningPostgres
let app: INestApplication
let prisma: PrismaService

// La guarda de administración habla con Better Auth; acá se prueba lo que pasa detrás de ella.
const dejaPasar = { canActivate: () => true }

const servidor = () => request(app.getHttpServer())
const buscar = (token: string) => new EnlacesDeInvitacion(prisma.clientSinFiltroDeLibro).buscar(token)

beforeEach(entrarEnLibroDePrueba)

beforeAll(async () => {
  entrarEnLibroDePrueba()
  postgres = await startPostgres()
  prisma = new PrismaService(postgres.url)
  const moduleRef = await Test.createTestingModule({
    controllers: [AdminController],
    providers: [
      InvitacionesALaAppUseCase,
      { provide: PrismaService, useValue: prisma },
      { provide: EnlacesDeInvitacion, useValue: new EnlacesDeInvitacion(prisma.clientSinFiltroDeLibro) },
      { provide: ResumenDeInstanciaUseCase, useValue: {} },
      { provide: AdminGuard, useValue: dejaPasar },
    ],
  })
    .overrideGuard(AdminGuard)
    .useValue(dejaPasar)
    .compile()

  app = moduleRef.createNestApplication()
  app.setGlobalPrefix('api/v1')
  app.useGlobalFilters(new AllExceptionsFilter())
  await app.init()
}, 180_000)

afterAll(async () => {
  await app.close()
  await prisma.$disconnect()
  await postgres.stop()
})

describe('invitaciones a la app', () => {
  it('invitar devuelve el token del enlace, que sirve para ese correo', async () => {
    const { body } = await servidor()
      .post('/api/v1/admin/invitations')
      .send({ email: 'nueva@ejemplo.com' })
      .expect(201)

    expect(body).toMatchObject({ email: 'nueva@ejemplo.com', token: expect.any(String) })
    expect(await buscar(body.token)).toMatchObject({ email: 'nueva@ejemplo.com', invitacionVigente: true })
  })

  it('renovar da otro token y el anterior deja de servir', async () => {
    const { body: invitacion } = await servidor()
      .post('/api/v1/admin/invitations')
      .send({ email: 'renueva@ejemplo.com' })
      .expect(201)

    const { body } = await servidor().post(`/api/v1/admin/invitations/${invitacion.id}/link`).expect(200)

    expect(body.token).not.toBe(invitacion.token)
    expect(await buscar(invitacion.token)).toBeNull()
    expect(await buscar(body.token)).not.toBeNull()
  })

  it('renovar una invitación que no existe contesta 404', async () => {
    await servidor().post('/api/v1/admin/invitations/no-existe/link').expect(404)
  })
})
