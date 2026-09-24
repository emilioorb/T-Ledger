import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { loadEnv } from '../../../shared/config/env.js'
import { LIBRO_DE_PRUEBA } from '../../../shared/libro/libro-de-prueba.js'
import { PrismaService } from '../../../shared/prisma/prisma.service.js'
import { startPostgres, type RunningPostgres } from '../../../test/postgres-container.js'
import { LibroPropioAlBorrarse } from '../application/libro-propio-al-borrarse.listener.js'
import { CABECERA_DEL_TOKEN, crearAuth, type Auth } from './auth.config.js'
import type { Request, Response } from 'express'
import { EnlacesDeInvitacion } from './enlaces-de-invitacion.js'
import { LibroMiddleware } from './libro.middleware.js'
import { asegurarLibroPropio } from './libro-propio.js'

// Registrar una cuenta es caro a propósito (scrypt).
const HASHEO = 60_000

let postgres: RunningPostgres
let prisma: PrismaService
let auth: Auth
let enlaces: EnlacesDeInvitacion

// Contra Better Auth de verdad: el libro nuevo sale por su API de organizaciones, igual que al
// registrarse.
beforeAll(async () => {
  postgres = await startPostgres()
  prisma = new PrismaService(postgres.url)
  auth = crearAuth(
    prisma.clientSinFiltroDeLibro,
    loadEnv({ DATABASE_URL: postgres.url, AUTH_SECRET: 'x'.repeat(32) }),
    async () => {},
    async () => {},
    async () => {},
  )
  enlaces = new EnlacesDeInvitacion(prisma.clientSinFiltroDeLibro)
}, 120_000)

afterAll(async () => {
  await prisma?.$disconnect()
  await postgres?.stop()
})

const db = () => prisma.clientSinFiltroDeLibro

const registrar = async (email: string) => {
  const invitacion = await db().accessInvitation.create({
    data: { email, expiresAt: new Date(Date.now() + 86_400_000), createdBy: LIBRO_DE_PRUEBA.userId },
  })
  const token = await enlaces.paraLaApp(invitacion.id)
  const { user } = await auth.api.signUpEmail({
    headers: new Headers({ [CABECERA_DEL_TOKEN]: token }),
    body: { name: email, email, password: 'una-clave-larga' },
  })
  return user.id
}

const sesionDe = async (email: string) => {
  const respuesta = await auth.api.signInEmail({ body: { email, password: 'una-clave-larga' }, asResponse: true })
  return new Headers({ cookie: respuesta.headers.getSetCookie().map((l) => l.split(';')[0]).join('; ') })
}

// La dueña comparte su libro con la invitada, y la invitada se queda solo con ese: el suyo se
// borró antes, cuando todavía tenía dos.
const compartido = async (prefijo: string) => {
  const duenaId = await registrar(`duena-${prefijo}@propio.test`)
  const invitadaId = await registrar(`invitada-${prefijo}@propio.test`)
  const duena = await sesionDe(`duena-${prefijo}@propio.test`)
  const libro = await db().book.create({
    data: { id: `lib-casa-${prefijo}`, name: 'Casa', slug: `casa-${prefijo}`, createdAt: new Date() },
  })
  await db().bookMember.create({
    data: { id: `m-duena-${prefijo}`, organizationId: libro.id, userId: duenaId, role: 'owner', createdAt: new Date() },
  })
  await db().bookMember.create({
    data: { id: `m-invitada-${prefijo}`, organizationId: libro.id, userId: invitadaId, role: 'viewer', createdAt: new Date() },
  })
  return { duena, duenaId, invitadaId, libroId: libro.id }
}

const librosDe = (userId: string) =>
  db().bookMember.findMany({ where: { userId }, select: { role: true, book: { select: { name: true } } } })

describe('nadie se queda sin libros', { timeout: HASHEO }, () => {
  it('sacar a alguien de su único libro le deja uno propio, vacío', async () => {
    const { duena, invitadaId, libroId } = await compartido('sacar')
    await db().book.deleteMany({ where: { bookmembers: { some: { userId: invitadaId, role: 'owner' } } } })

    await auth.api.removeMember({
      headers: duena,
      body: { memberIdOrEmail: 'invitada-sacar@propio.test', organizationId: libroId },
    })

    expect(await librosDe(invitadaId)).toEqual([{ role: 'owner', book: { name: 'Personal' } }])
  })

  it('a quien le queda otro libro no se le abre uno de más', async () => {
    const { duena, invitadaId, libroId } = await compartido('otro')

    await auth.api.removeMember({
      headers: duena,
      body: { memberIdOrEmail: 'invitada-otro@propio.test', organizationId: libroId },
    })

    expect(await librosDe(invitadaId)).toHaveLength(1)
  })

  it('borrar un libro compartido le deja uno propio a quien era el único suyo', async () => {
    const { duenaId, invitadaId, libroId } = await compartido('borrar')
    await db().book.deleteMany({ where: { bookmembers: { some: { userId: invitadaId, role: 'owner' } } } })
    await db().book.delete({ where: { id: libroId } })

    await new LibroPropioAlBorrarse(auth, prisma).manejar({ bookId: libroId, miembros: [duenaId, invitadaId] })

    expect(await librosDe(invitadaId)).toEqual([{ role: 'owner', book: { name: 'Personal' } }])
    // La dueña conserva su libro personal: no se le abre otro.
    expect(await librosDe(duenaId)).toHaveLength(1)
  })

  it('irse por cuenta propia del único libro: el middleware del libro le abre uno en su próximo pedido', async () => {
    const { invitadaId, libroId } = await compartido('irse')
    await db().book.deleteMany({ where: { bookmembers: { some: { userId: invitadaId, role: 'owner' } } } })
    const invitada = await sesionDe('invitada-irse@propio.test')
    await auth.api.leaveOrganization({ headers: invitada, body: { organizationId: libroId } })
    expect(await librosDe(invitadaId)).toEqual([])

    const pedido = { headers: Object.fromEntries(invitada.entries()), header: () => undefined } as unknown as Request
    const siguio = await new Promise<unknown>((listo) => void new LibroMiddleware(prisma, auth).use(pedido, {} as Response, listo))

    expect(siguio).toBeUndefined()
    expect(await librosDe(invitadaId)).toEqual([{ role: 'owner', book: { name: 'Personal' } }])
  })

  it('dos pérdidas a la vez abren un solo libro, y la sesión queda parada en él', async () => {
    const { invitadaId } = await compartido('dos')
    await sesionDe('invitada-dos@propio.test')
    await db().bookMember.deleteMany({ where: { userId: invitadaId } })

    await Promise.all([asegurarLibroPropio(auth, db(), invitadaId), asegurarLibroPropio(auth, db(), invitadaId)])

    const libros = await db().bookMember.findMany({ where: { userId: invitadaId } })
    expect(libros).toHaveLength(1)
    const sesiones = await db().authSession.findMany({ where: { userId: invitadaId } })
    expect(sesiones.map((sesion) => sesion.activeOrganizationId)).toEqual(sesiones.map(() => libros[0]!.organizationId))
  })
})

