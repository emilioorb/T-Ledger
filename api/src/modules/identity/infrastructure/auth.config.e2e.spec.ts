import { PrismaPg } from '@prisma/adapter-pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PrismaClient } from '../../../generated/prisma/client.js'
import { loadEnv } from '../../../shared/config/env.js'
import { LIBRO_DE_PRUEBA } from '../../../shared/libro/libro-de-prueba.js'
import { startPostgres, type RunningPostgres } from '../../../test/postgres-container.js'
import { crearAuth, type Auth } from './auth.config.js'

// Cada test registra y entra con contraseña, y el hash de Better Auth (scrypt) es caro a
// propósito. Con la suite entera en paralelo no alcanzan los 5 s por defecto.
const HASHEO = 20_000

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

describe('registro', { timeout: HASHEO }, () => {
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

// Entra con correo y contraseña y devuelve las cabeceras de esa sesión, como las mandaría el
// navegador en la petición siguiente.
const entrar = async (email: string, password: string) => {
  const respuesta = await auth.api.signInEmail({ body: { email, password }, asResponse: true })
  const cookie = respuesta.headers
    .getSetCookie()
    .map((linea) => linea.split(';')[0])
    .join('; ')
  return new Headers({ cookie })
}

const invitar = (id: string, email: string) =>
  prisma.bookInvitation.create({
    data: {
      id,
      organizationId: LIBRO_DE_PRUEBA.bookId,
      email,
      role: 'member',
      expiresAt: new Date(Date.now() + 86_400_000),
      inviterId: LIBRO_DE_PRUEBA.userId,
    },
  })

describe('el dueño de un libro', { timeout: HASHEO }, () => {
  // Better Auth decide el renombre con su propio permiso, `organization: update`, no con el
  // `libro: update` del dominio. Sin él, el dueño recibía 403 en cada intento.
  it('le puede cambiar el nombre', async () => {
    await invitar('inv_renombra', 'renombra@tape.test')
    await auth.api.signUpEmail({
      body: { name: 'Renombra', email: 'renombra@tape.test', password: 'una-clave-larga' },
    })
    const headers = await entrar('renombra@tape.test', 'una-clave-larga')
    const [libro] = await auth.api.listOrganizations({ headers })

    await auth.api.updateOrganization({
      headers,
      body: { organizationId: libro!.id, data: { name: 'Casa' } },
    })

    const renombrado = await prisma.book.findUnique({ where: { id: libro!.id } })
    expect(renombrado?.name).toBe('Casa')
  })
})

describe('una sesión nueva', { timeout: HASHEO }, () => {
  // Con dos libros o más, una sesión sin libro activo recibía 403 en cada consulta: el servidor
  // no tiene a cuál atribuirla. La pantalla quedaba vacía hasta que el navegador elegía uno.
  it('nace parada en el libro más viejo de la persona', async () => {
    await invitar('inv_dos_libros', 'dos@tape.test')
    const { user } = await auth.api.signUpEmail({
      body: { name: 'Dos', email: 'dos@tape.test', password: 'una-clave-larga' },
    })
    const personal = await prisma.bookMember.findFirstOrThrow({ where: { userId: user.id } })
    await auth.api.createOrganization({
      body: { name: 'Casa', slug: `casa-${user.id}`, userId: user.id },
    })

    const headers = await entrar('dos@tape.test', 'una-clave-larga')
    const sesion = await auth.api.getSession({ headers })

    expect(sesion?.session.activeOrganizationId).toBe(personal.organizationId)
  })
})
