import { ConflictException } from '@nestjs/common'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { LIBRO_DE_PRUEBA } from '../../../shared/libro/libro-de-prueba.js'
import { PrismaService } from '../../../shared/prisma/prisma.service.js'
import { startPostgres, type RunningPostgres } from '../../../test/postgres-container.js'
import { InvitacionesALaAppUseCase } from './invitaciones-a-la-app.use-case.js'

let postgres: RunningPostgres
let prisma: PrismaService
let invitaciones: InvitacionesALaAppUseCase

beforeAll(async () => {
  postgres = await startPostgres()
  prisma = new PrismaService(postgres.url)
  await prisma.$connect()
  invitaciones = new InvitacionesALaAppUseCase(prisma)
}, 180_000)

afterAll(async () => {
  await prisma.$disconnect()
  await postgres.stop()
})

beforeEach(async () => {
  await prisma.clientSinFiltroDeLibro.accessInvitation.deleteMany()
})

const admin = LIBRO_DE_PRUEBA.userId

describe('invitar a la app', () => {
  it('crea una invitación que vence en una semana', async () => {
    const hoy = new Date()
    const invitacion = await invitaciones.invitar('Nueva@Correo.test ', admin)

    expect(invitacion.email).toBe('nueva@correo.test')
    const dias = (invitacion.expiresAt.getTime() - hoy.getTime()) / 86_400_000
    expect(Math.round(dias)).toBe(7)
  })

  it('volver a invitar el mismo correo renueva la invitación en vez de duplicarla', async () => {
    await invitaciones.invitar('repite@correo.test', admin)
    await invitaciones.invitar('repite@correo.test', admin)

    expect(await invitaciones.pendientes()).toHaveLength(1)
  })

  it('no invita un correo que ya tiene cuenta', async () => {
    // La persona de prueba ya tiene cuenta.
    await expect(invitaciones.invitar('pruebas@tape.test', admin)).rejects.toBeInstanceOf(ConflictException)
  })

  it('las pendientes no incluyen las gastadas ni las vencidas', async () => {
    await invitaciones.invitar('vigente@correo.test', admin)
    await prisma.clientSinFiltroDeLibro.accessInvitation.createMany({
      data: [
        { email: 'gastada@correo.test', expiresAt: new Date(Date.now() + 86_400_000), usedAt: new Date(), createdBy: admin },
        { email: 'vencida@correo.test', expiresAt: new Date(Date.now() - 86_400_000), createdBy: admin },
      ],
    })

    expect((await invitaciones.pendientes()).map((i) => i.email)).toEqual(['vigente@correo.test'])
  })

  it('cancelar una la saca de las pendientes', async () => {
    const invitacion = await invitaciones.invitar('arrepentido@correo.test', admin)

    await invitaciones.cancelar(invitacion.id)

    expect(await invitaciones.pendientes()).toEqual([])
  })
})
