import { PrismaPg } from '@prisma/adapter-pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PrismaClient } from '../../../generated/prisma/client.js'
import { loadEnv } from '../../../shared/config/env.js'
import { LIBRO_DE_PRUEBA } from '../../../shared/libro/libro-de-prueba.js'
import { startPostgres, type RunningPostgres } from '../../../test/postgres-container.js'
import { crearAuth, type Auth } from './auth.config.js'

let postgres: RunningPostgres
let prisma: PrismaClient
let auth: Auth
const librosSembrados: string[] = []

beforeAll(async () => {
  postgres = await startPostgres()
  prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: postgres.url }) })
  auth = crearAuth(
    prisma,
    loadEnv({ DATABASE_URL: postgres.url, AUTH_SECRET: 'x'.repeat(32) }),
    async (bookId) => {
      librosSembrados.push(bookId)
    },
    async () => {},
  )
}, 120_000)

afterAll(async () => {
  await prisma?.$disconnect()
  await postgres?.stop()
})

describe('registro', () => {
  it('toda cuenta nueva nace dueña de su libro personal, con el plan de cuentas pedido', async () => {
    // La instancia ya tiene cuenta, así que solo entra quien trae invitación: el caso en que
    // antes quedaba adentro del libro ajeno y sin uno propio.
    await prisma.bookInvitation.create({
      data: {
        id: 'inv_personal',
        organizationId: LIBRO_DE_PRUEBA.bookId,
        email: 'nueva@tape.test',
        role: 'member',
        expiresAt: new Date(Date.now() + 86_400_000),
        inviterId: LIBRO_DE_PRUEBA.userId,
      },
    })

    const { user } = await auth.api.signUpEmail({
      body: { name: 'Nueva', email: 'nueva@tape.test', password: 'una-clave-larga' },
    })

    const membresias = await prisma.bookMember.findMany({
      where: { userId: user.id },
      include: { book: true },
    })
    expect(membresias).toHaveLength(1)
    expect(membresias[0]).toMatchObject({ role: 'owner', book: { name: 'Personal' } })
    expect(librosSembrados).toContain(membresias[0]?.organizationId)
  })
})
