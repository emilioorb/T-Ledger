import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { loadEnv } from '../../../shared/config/env.js'
import { LIBRO_DE_PRUEBA } from '../../../shared/libro/libro-de-prueba.js'
import { PrismaService } from '../../../shared/prisma/prisma.service.js'
import { startPostgres, type RunningPostgres } from '../../../test/postgres-container.js'
import { PrismaRastroRepository } from '../../auditoria/infrastructure/prisma-rastro.repository.js'
import { CABECERA_DEL_TOKEN, crearAuth, type Auth } from './auth.config.js'
import { EnlacesDeInvitacion } from './enlaces-de-invitacion.js'
import { rastroDeMiembros } from './rastro-de-miembros.js'

const HASHEO = 30_000

let postgres: RunningPostgres
let prisma: PrismaService
let auth: Auth
let enlaces: EnlacesDeInvitacion

// Con el rastro de verdad y no con un doble: el doble no pasa por el filtro de libro, y así no
// se veía que la entrada se escribía sin transacción y el gancho tiraba.
beforeAll(async () => {
  postgres = await startPostgres()
  prisma = new PrismaService(postgres.url)
  auth = crearAuth(
    prisma.clientSinFiltroDeLibro,
    loadEnv({ DATABASE_URL: postgres.url, AUTH_SECRET: 'x'.repeat(32) }),
    async () => {},
    rastroDeMiembros(prisma, new PrismaRastroRepository(prisma)),
    async () => {},
  )
  enlaces = new EnlacesDeInvitacion(prisma.clientSinFiltroDeLibro)
}, 120_000)

afterAll(async () => {
  await prisma?.$disconnect()
  await postgres?.stop()
})

const registrar = async (email: string) => {
  const invitacion = await prisma.clientSinFiltroDeLibro.accessInvitation.create({
    data: { email, expiresAt: new Date(Date.now() + 86_400_000), createdBy: LIBRO_DE_PRUEBA.userId },
  })
  const token = await enlaces.paraLaApp(invitacion.id)
  return auth.api.signUpEmail({
    headers: new Headers({ [CABECERA_DEL_TOKEN]: token }),
    body: { name: email, email, password: 'una-clave-larga' },
  })
}

describe('el rastro de la gente de un libro', { timeout: HASHEO }, () => {
  it('invitar a alguien queda anotado en el libro, firmado por quien invitó', async () => {
    const { user } = await registrar('duena@rastro.test')
    const respuesta = await auth.api.signInEmail({
      body: { email: 'duena@rastro.test', password: 'una-clave-larga' },
      asResponse: true,
    })
    const duena = new Headers({ cookie: respuesta.headers.getSetCookie().map((l) => l.split(';')[0]).join('; ') })
    const [libro] = await auth.api.listOrganizations({ headers: duena })

    await auth.api.createInvitation({
      headers: duena,
      body: { email: 'invitada@rastro.test', role: 'viewer', organizationId: libro!.id },
    })

    const entradas = await prisma.clientSinFiltroDeLibro.auditLog.findMany({
      where: { bookId: libro!.id, entity: 'miembro' },
    })
    expect(entradas).toHaveLength(1)
    expect(entradas[0]).toMatchObject({ userId: user.id, entityId: 'invitada@rastro.test', action: 'crear' })
  })
})
