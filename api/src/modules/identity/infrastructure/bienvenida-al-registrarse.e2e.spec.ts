import { PrismaPg } from '@prisma/adapter-pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PrismaClient } from '../../../generated/prisma/client.js'
import { startPostgres, type RunningPostgres } from '../../../test/postgres-container.js'
import { marcarSiTieneInvitacion } from './bienvenida-al-registrarse.js'
import { PrismaMarcaDeBienvenida } from './prisma-marca-de-bienvenida.js'

let postgres: RunningPostgres
let prisma: PrismaClient

const AHORA = new Date('2026-09-25T15:00:00.000Z')

const persona = (id: string) =>
  prisma.authUser.create({ data: { id, name: id, email: `${id}@tape.test` } })

const libroConInvitacion = async (email: string, expiresAt: Date, status = 'pending') => {
  await persona(`dueno-${email}`)
  const libro = await prisma.book.create({
    data: { id: `lib-${email}`, name: 'Casa', slug: `casa-${email}`, createdAt: AHORA },
  })
  await prisma.bookInvitation.create({
    data: { id: `inv-${email}`, organizationId: libro.id, email, role: 'editor', status, expiresAt, inviterId: `dueno-${email}` },
  })
}

beforeAll(async () => {
  postgres = await startPostgres()
  prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: postgres.url }) })
}, 120_000)

afterAll(async () => {
  await prisma?.$disconnect()
  await postgres?.stop()
})

describe('marca de la bienvenida', () => {
  it('nace sin ver y queda vista al marcarla, dos veces sin error', async () => {
    const marca = new PrismaMarcaDeBienvenida(prisma)
    await persona('ana')
    expect(await marca.vista('ana')).toBe(false)
    await marca.marcar('ana')
    await marca.marcar('ana')
    expect(await marca.vista('ana')).toBe(true)
  })
})

describe('al registrarse', () => {
  it('con una invitación pendiente a un libro, la bienvenida queda vista', async () => {
    await libroConInvitacion('invitada@tape.test', new Date(AHORA.getTime() + 86_400_000))
    await persona('invitada')
    expect(await marcarSiTieneInvitacion(prisma, 'invitada', 'invitada@tape.test', AHORA)).toBe(true)
    expect(await new PrismaMarcaDeBienvenida(prisma).vista('invitada')).toBe(true)
  })

  it('con la invitación vencida, no', async () => {
    await libroConInvitacion('vencida@tape.test', new Date(AHORA.getTime() - 1))
    await persona('vencida')
    expect(await marcarSiTieneInvitacion(prisma, 'vencida', 'vencida@tape.test', AHORA)).toBe(false)
    expect(await new PrismaMarcaDeBienvenida(prisma).vista('vencida')).toBe(false)
  })

  it('con la invitación ya respondida, no', async () => {
    await libroConInvitacion('respondida@tape.test', new Date(AHORA.getTime() + 86_400_000), 'canceled')
    await persona('respondida')
    expect(await marcarSiTieneInvitacion(prisma, 'respondida', 'respondida@tape.test', AHORA)).toBe(false)
  })
})
