import { PrismaPg } from '@prisma/adapter-pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PrismaClient } from '../../../generated/prisma/client.js'
import { loadEnv } from '../../../shared/config/env.js'
import { LIBRO_DE_PRUEBA } from '../../../shared/libro/libro-de-prueba.js'
import { startPostgres, type RunningPostgres } from '../../../test/postgres-container.js'
import { CABECERA_DEL_TOKEN, crearAuth, type Auth, type CambioDeMiembro } from './auth.config.js'
import { EnlacesDeInvitacion } from './enlaces-de-invitacion.js'

// Registrar una cuenta es caro a propósito (scrypt).
const HASHEO = 30_000

let postgres: RunningPostgres
let prisma: PrismaClient
let auth: Auth
let enlaces: EnlacesDeInvitacion
const cambios: CambioDeMiembro[] = []

beforeAll(async () => {
  postgres = await startPostgres()
  prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: postgres.url }) })
  auth = crearAuth(
    prisma,
    loadEnv({ DATABASE_URL: postgres.url, AUTH_SECRET: 'x'.repeat(32) }),
    async () => {},
    async (cambio) => {
      cambios.push(cambio)
    },
    async () => {},
  )
  enlaces = new EnlacesDeInvitacion(prisma)
}, 120_000)

afterAll(async () => {
  await prisma?.$disconnect()
  await postgres?.stop()
})

const registrar = async (email: string) => {
  const invitacion = await prisma.accessInvitation.create({
    data: { email, expiresAt: new Date(Date.now() + 86_400_000), createdBy: LIBRO_DE_PRUEBA.userId },
  })
  const token = await enlaces.paraLaApp(invitacion.id)
  return auth.api.signUpEmail({
    headers: new Headers({ [CABECERA_DEL_TOKEN]: token }),
    body: { name: email, email, password: 'una-clave-larga' },
  })
}

const sesionDe = async (email: string) => {
  const respuesta = await auth.api.signInEmail({ body: { email, password: 'una-clave-larga' }, asResponse: true })
  return new Headers({ cookie: respuesta.headers.getSetCookie().map((l) => l.split(';')[0]).join('; ') })
}

describe('la gente de un libro', { timeout: HASHEO }, () => {
  // Cambiar un rol o sacar a alguien exige saber quién lo pide, para el registro: los ganchos de
  // organización solo reciben al afectado. Si el autor no llega, las dos cosas dan 500.
  // Contra Better Auth de verdad: un test que simulaba la cadena asíncrona daba verde mientras
  // en producción sacar a alguien fallaba.
  it('el dueño le cambia el rol y la saca, y los dos cambios quedan firmados por ella', async () => {
    await registrar('duena@tape.test')
    await registrar('invitada@tape.test')
    const duena = await sesionDe('duena@tape.test')
    const [libro] = await auth.api.listOrganizations({ headers: duena })
    await auth.api.setActiveOrganization({ headers: duena, body: { organizationId: libro!.id } })
    const invitacion = await auth.api.createInvitation({
      headers: duena,
      body: { email: 'invitada@tape.test', role: 'viewer', organizationId: libro!.id },
    })
    const token = (await enlaces.paraUnLibro(invitacion.id, libro!.id)) ?? ''
    const invitada = await sesionDe('invitada@tape.test')
    invitada.set(CABECERA_DEL_TOKEN, token)
    await auth.api.acceptInvitation({ headers: invitada, body: { invitationId: invitacion.id } })

    const miembro = await prisma.bookMember.findFirstOrThrow({
      where: { organizationId: libro!.id, authuser: { email: 'invitada@tape.test' } },
    })
    await auth.api.updateMemberRole({
      headers: duena,
      body: { memberId: miembro.id, role: 'editor', organizationId: libro!.id },
    })
    const duenaId = (await prisma.authUser.findUniqueOrThrow({ where: { email: 'duena@tape.test' } })).id
    expect(cambios.at(-1)).toMatchObject({
      accion: 'editar',
      autorId: duenaId,
      despues: expect.objectContaining({ rol: 'editor' }),
    })

    await auth.api.removeMember({
      headers: duena,
      body: { memberIdOrEmail: 'invitada@tape.test', organizationId: libro!.id },
    })

    const quedan = await prisma.bookMember.count({ where: { organizationId: libro!.id } })
    expect(quedan).toBe(1)
    expect(cambios.at(-1)).toMatchObject({ accion: 'eliminar', autorId: duenaId })
  })
})
