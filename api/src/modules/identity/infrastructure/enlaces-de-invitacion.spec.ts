import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PrismaService } from '../../../shared/prisma/prisma.service.js'
import { startPostgres, type RunningPostgres } from '../../../test/postgres-container.js'
import { EnlacesDeInvitacion } from './enlaces-de-invitacion.js'
import { hashDelToken } from './registro.js'

let postgres: RunningPostgres
let prisma: PrismaService
let enlaces: EnlacesDeInvitacion

const enUnaSemana = () => new Date(Date.now() + 7 * 86_400_000)

const invitacionALaApp = (email: string) =>
  prisma.clientSinFiltroDeLibro.accessInvitation.create({
    data: { email, expiresAt: enUnaSemana(), createdBy: 'usr_test' },
  })

const invitacionAlLibro = (email: string, status = 'pending') =>
  prisma.clientSinFiltroDeLibro.bookInvitation.create({
    data: {
      id: `inv_${email}_${status}`,
      organizationId: 'lib_test',
      email,
      role: 'editor',
      status,
      expiresAt: enUnaSemana(),
      inviterId: 'usr_test',
    },
  })

beforeAll(async () => {
  postgres = await startPostgres()
  prisma = new PrismaService(postgres.url)
  enlaces = new EnlacesDeInvitacion(prisma.clientSinFiltroDeLibro)
}, 180_000)

afterAll(async () => {
  await prisma.$disconnect()
  await postgres.stop()
})

describe('EnlacesDeInvitacion', () => {
  it('el enlace de la app se encuentra por su token, con el correo de la invitación', async () => {
    const invitacion = await invitacionALaApp('a@ejemplo.com')
    const token = await enlaces.paraLaApp(invitacion.id)

    const enlace = await enlaces.buscar(token)

    expect(enlace).toMatchObject({ email: 'a@ejemplo.com', usedAt: null, invitacionVigente: true })
  })

  it('en la base queda el hash y no el token', async () => {
    const invitacion = await invitacionALaApp('b@ejemplo.com')
    const token = await enlaces.paraLaApp(invitacion.id)

    const filas = await prisma.clientSinFiltroDeLibro.invitationLink.findMany({
      where: { accessInvitationId: invitacion.id },
    })
    expect(filas).toHaveLength(1)
    expect(filas[0]?.tokenHash).toBe(hashDelToken(token))
    expect(JSON.stringify(filas)).not.toContain(token)
  })

  it('pedir el enlace otra vez lo renueva: el anterior deja de servir', async () => {
    const invitacion = await invitacionALaApp('c@ejemplo.com')
    const viejo = await enlaces.paraLaApp(invitacion.id)
    const nuevo = await enlaces.paraLaApp(invitacion.id)

    expect(await enlaces.buscar(viejo)).toBeNull()
    expect(await enlaces.buscar(nuevo)).not.toBeNull()
  })

  it('un token que no existe no encuentra nada', async () => {
    expect(await enlaces.buscar('A'.repeat(43))).toBeNull()
  })

  it('el enlace de un libro solo se crea para una invitación de ese libro', async () => {
    const invitacion = await invitacionAlLibro('d@ejemplo.com')

    expect(await enlaces.paraUnLibro(invitacion.id, 'lib_otro')).toBeNull()
    const token = await enlaces.paraUnLibro(invitacion.id, 'lib_test')
    expect(token).not.toBeNull()
    expect(await enlaces.buscar(token ?? '')).toMatchObject({ email: 'd@ejemplo.com', invitacionVigente: true })
  })

  it('una invitación a un libro que ya no está pendiente deja al enlace sin efecto', async () => {
    const invitacion = await invitacionAlLibro('e@ejemplo.com')
    const token = (await enlaces.paraUnLibro(invitacion.id, 'lib_test')) ?? ''
    await prisma.clientSinFiltroDeLibro.bookInvitation.update({
      where: { id: invitacion.id },
      data: { status: 'canceled' },
    })

    expect(await enlaces.buscar(token)).toMatchObject({ invitacionVigente: false })
  })

  it('gastar el enlace de la app lo marca usado, y también la invitación', async () => {
    const invitacion = await invitacionALaApp('f@ejemplo.com')
    const token = await enlaces.paraLaApp(invitacion.id)

    await enlaces.gastar(token, 'f@ejemplo.com')

    expect((await enlaces.buscar(token))?.usedAt).not.toBeNull()
    const despues = await prisma.clientSinFiltroDeLibro.accessInvitation.findUnique({ where: { id: invitacion.id } })
    expect(despues?.usedAt).not.toBeNull()
  })

  it('gastar un enlace que ya no existe no falla: pudo haberse renovado en el medio', async () => {
    const invitacion = await invitacionALaApp('h@ejemplo.com')
    const viejo = await enlaces.paraLaApp(invitacion.id)
    await enlaces.paraLaApp(invitacion.id)

    await expect(enlaces.gastar(viejo, 'h@ejemplo.com')).resolves.toBeUndefined()
    await expect(enlaces.gastar('B'.repeat(43), 'nadie@ejemplo.com')).resolves.toBeUndefined()
  })

  it('una invitación a un libro que ya venció no da enlace', async () => {
    const invitacion = await prisma.clientSinFiltroDeLibro.bookInvitation.create({
      data: {
        id: 'inv_vencida',
        organizationId: 'lib_test',
        email: 'i@ejemplo.com',
        role: 'editor',
        status: 'pending',
        expiresAt: new Date(Date.now() - 1000),
        inviterId: 'usr_test',
      },
    })

    expect(await enlaces.paraUnLibro(invitacion.id, 'lib_test')).toBeNull()
  })

  it('el enlace de un libro abre su invitación y no otra', async () => {
    const propia = await invitacionAlLibro('j@ejemplo.com')
    const otra = await invitacionAlLibro('k@ejemplo.com')
    const token = (await enlaces.paraUnLibro(propia.id, 'lib_test')) ?? ''

    expect(await enlaces.abreLaInvitacion(token, propia.id)).toBe(true)
    expect(await enlaces.abreLaInvitacion(token, otra.id)).toBe(false)
  })

  it('cancelar la invitación a la app se lleva su enlace', async () => {
    const invitacion = await invitacionALaApp('g@ejemplo.com')
    const token = await enlaces.paraLaApp(invitacion.id)

    await prisma.clientSinFiltroDeLibro.accessInvitation.delete({ where: { id: invitacion.id } })

    expect(await enlaces.buscar(token)).toBeNull()
  })
})
