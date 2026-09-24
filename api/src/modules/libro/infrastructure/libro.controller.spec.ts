import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AllExceptionsFilter } from '../../../shared/http/all-exceptions.filter.js'
import { entrarEnLibroDePrueba } from '../../../shared/libro/libro-de-prueba.js'
import { PrismaService } from '../../../shared/prisma/prisma.service.js'
import { startPostgres, type RunningPostgres } from '../../../test/postgres-container.js'
import { RASTRO } from '../../auditoria/domain/rastro.port.js'
import { PrismaRastroRepository } from '../../auditoria/infrastructure/prisma-rastro.repository.js'
import { UNIT_OF_WORK } from '../../../shared/prisma/unit-of-work.port.js'
import { EnlacesDeInvitacion } from '../../identity/infrastructure/enlaces-de-invitacion.js'
import { VerificadorDeContrasena } from '../../identity/infrastructure/verificador-de-contrasena.js'
import { BorrarLibroUseCase } from '../application/borrar-libro.use-case.js'
import { EnlaceDeInvitacionUseCase } from '../application/enlace-de-invitacion.use-case.js'
import { MisLibrosUseCase } from '../application/mis-libros.use-case.js'
import { VaciarLibroUseCase } from '../application/vaciar-libro.use-case.js'
import { LibroController } from './libro.controller.js'

let postgres: RunningPostgres
let app: INestApplication
let prisma: PrismaService

const enlace = (invitationId: string) =>
  request(app.getHttpServer()).post(`/api/v1/book/invitations/${invitationId}/link`)

const invitacion = (id: string, organizationId: string, status = 'pending') =>
  prisma.clientSinFiltroDeLibro.bookInvitation.create({
    data: {
      id,
      organizationId,
      email: `${id}@ejemplo.com`,
      role: 'editor',
      status,
      expiresAt: new Date(Date.now() + 86_400_000),
      inviterId: 'usr_test',
    },
  })

beforeEach(entrarEnLibroDePrueba)

beforeAll(async () => {
  entrarEnLibroDePrueba()
  postgres = await startPostgres()
  prisma = new PrismaService(postgres.url)
  const moduleRef = await Test.createTestingModule({
    controllers: [LibroController],
    providers: [
      EnlaceDeInvitacionUseCase,
      { provide: EnlacesDeInvitacion, useValue: new EnlacesDeInvitacion(prisma.clientSinFiltroDeLibro) },
      // El rastro de verdad: un doble no pasa por el filtro de libro, y así no se veía que la
      // entrada se escribía sin transacción.
      { provide: RASTRO, useValue: new PrismaRastroRepository(prisma) },
      { provide: UNIT_OF_WORK, useValue: prisma },
      { provide: VaciarLibroUseCase, useValue: {} },
      { provide: MisLibrosUseCase, useValue: {} },
      { provide: BorrarLibroUseCase, useValue: {} },
      { provide: VerificadorDeContrasena, useValue: {} },
    ],
  }).compile()

  app = moduleRef.createNestApplication()
  app.setGlobalPrefix('api/v1')
  app.useGlobalFilters(new AllExceptionsFilter())
  await app.init()
  await prisma.clientSinFiltroDeLibro.book.create({
    data: { id: 'lib_otro', name: 'Otro', slug: 'otro-libro-enlaces', createdAt: new Date() },
  })
}, 180_000)

afterAll(async () => {
  await app.close()
  await prisma.$disconnect()
  await postgres.stop()
})

describe('POST /book/invitations/:id/link', () => {
  it('da un token que sirve para la invitación pendiente del libro', async () => {
    await invitacion('inv_propia', 'lib_test')

    const { body } = await enlace('inv_propia').expect(200)

    const encontrado = await new EnlacesDeInvitacion(prisma.clientSinFiltroDeLibro).buscar(body.token)
    expect(encontrado).toMatchObject({ email: 'inv_propia@ejemplo.com', invitacionVigente: true })
    const rastro = await prisma.clientSinFiltroDeLibro.auditLog.findMany({ where: { entityId: 'inv_propia' } })
    expect(rastro).toEqual([expect.objectContaining({ entity: 'miembro', action: 'editar' })])
    expect(JSON.stringify(rastro)).not.toContain(body.token)
  })

  it('con la invitación de otro libro contesta 404 y no crea enlace', async () => {
    await invitacion('inv_ajena', 'lib_otro')

    await enlace('inv_ajena').expect(404)

    const rastro = await prisma.clientSinFiltroDeLibro.auditLog.count({ where: { entityId: 'inv_ajena' } })
    expect(rastro).toBe(0)

    const enlaces = await prisma.clientSinFiltroDeLibro.invitationLink.count({
      where: { bookInvitationId: 'inv_ajena' },
    })
    expect(enlaces).toBe(0)
  })

  it('con una invitación que ya no está pendiente contesta 404', async () => {
    await invitacion('inv_aceptada', 'lib_test', 'accepted')

    await enlace('inv_aceptada').expect(404)
  })
})
