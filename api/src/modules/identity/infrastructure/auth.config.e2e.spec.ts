import { PrismaPg } from '@prisma/adapter-pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PrismaClient } from '../../../generated/prisma/client.js'
import { loadEnv } from '../../../shared/config/env.js'
import { LIBRO_DE_PRUEBA } from '../../../shared/libro/libro-de-prueba.js'
import { startPostgres, type RunningPostgres } from '../../../test/postgres-container.js'
import { CABECERA_DEL_TOKEN, crearAuth, RESPONDER_UNA_INVITACION, type Auth } from './auth.config.js'
import { EnlacesDeInvitacion } from './enlaces-de-invitacion.js'
import { SIN_INVITACION } from './registro.js'

// Cada test registra y entra con contraseña, y el hash de Better Auth (scrypt) es caro a
// propósito. Con la suite entera en paralelo no alcanzan los 5 s por defecto.
const HASHEO = 20_000

let postgres: RunningPostgres
let prisma: PrismaClient
let auth: Auth
let enlaces: EnlacesDeInvitacion
const librosSembrados: string[] = []
const librosBorrados: string[] = []

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
    async (libros) => {
      librosBorrados.push(...libros.map((libro) => libro.bookId))
    },
  )
  enlaces = new EnlacesDeInvitacion(prisma)
}, 120_000)

// El registro exige el token del enlace, en la cabecera que manda la pantalla de crear cuenta.
const conEnlace = (token: string) => new Headers({ [CABECERA_DEL_TOKEN]: token })

// El admin da acceso a la app, saca el enlace y la persona se registra con él: el único camino
// que crea cuentas.
const enlaceALaApp = async (email: string) => {
  const invitacion = await prisma.accessInvitation.create({
    data: { email, expiresAt: new Date(Date.now() + 86_400_000), createdBy: LIBRO_DE_PRUEBA.userId },
  })
  return enlaces.paraLaApp(invitacion.id)
}

const registrarConEnlace = async (email: string, name: string) => {
  const token = await enlaceALaApp(email)
  return auth.api.signUpEmail({
    headers: conEnlace(token),
    body: { name, email, password: 'una-clave-larga' },
  })
}

afterAll(async () => {
  await prisma?.$disconnect()
  await postgres?.stop()
})

describe('registro', { timeout: HASHEO }, () => {
  it('toda cuenta nueva nace dueña de su libro personal, con el plan de cuentas pedido', async () => {
    // La instancia ya tiene cuenta, así que solo entra quien trae invitación: el caso en que
    // antes quedaba adentro del libro ajeno y sin uno propio.
    const { user } = await registrarConEnlace('nueva@tape.test', 'Nueva')

    const membresias = await prisma.bookMember.findMany({
      where: { userId: user.id },
      include: { book: true },
    })
    expect(membresias).toHaveLength(1)
    expect(membresias[0]).toMatchObject({ role: 'owner', book: { name: 'Personal' } })
    expect(librosSembrados).toContain(membresias[0]?.organizationId)
  })

  it('la marca de la bienvenida no se puede mandar al registrarse', async () => {
    const token = await enlaceALaApp('marca@tape.test')
    const alta = auth.api.signUpEmail({
      headers: conEnlace(token),
      body: { name: 'Marca', email: 'marca@tape.test', password: 'una-clave-larga', bienvenidaVistaEn: new Date() } as never,
    })
    await expect(alta).rejects.toThrow()
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

describe('el dueño de un libro', { timeout: HASHEO }, () => {
  // Better Auth decide el renombre con su propio permiso, `organization: update`, no con el
  // `libro: update` del dominio. Sin él, el dueño recibía 403 en cada intento.
  it('le puede cambiar el nombre', async () => {
    await registrarConEnlace('renombra@tape.test', 'Renombra')
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
    const { user } = await registrarConEnlace('dos@tape.test', 'Dos')
    const personal = await prisma.bookMember.findFirstOrThrow({ where: { userId: user.id } })
    await auth.api.createOrganization({
      body: { name: 'Casa', slug: `casa-${user.id}`, userId: user.id },
    })

    const headers = await entrar('dos@tape.test', 'una-clave-larga')
    const sesion = await auth.api.getSession({ headers })

    expect(sesion?.session.activeOrganizationId).toBe(personal.organizationId)
  })
})

describe('la invitación a la app', { timeout: HASHEO }, () => {
  const invitarALaApp = (email: string, expiresAt: Date) =>
    prisma.accessInvitation.create({
      data: { email, expiresAt, createdBy: LIBRO_DE_PRUEBA.userId },
    })

  it('con su enlace deja registrarse con cuenta propia, sin entrar al libro de nadie, y se gasta', async () => {
    const invitacion = await invitarALaApp('pidio-acceso@tape.test', new Date(Date.now() + 86_400_000))
    const token = await enlaces.paraLaApp(invitacion.id)

    const { user } = await auth.api.signUpEmail({
      headers: conEnlace(token),
      body: { name: 'Pidió acceso', email: 'pidio-acceso@tape.test', password: 'una-clave-larga' },
    })

    const libros = await prisma.bookMember.findMany({ where: { userId: user.id }, include: { book: true } })
    expect(libros.map((m) => m.book.name)).toEqual(['Personal'])
    const despues = await prisma.accessInvitation.findUniqueOrThrow({ where: { id: invitacion.id } })
    expect(despues.usedAt).not.toBeNull()
    expect((await enlaces.buscar(token))?.usedAt).not.toBeNull()
  })

  it('vencida no deja registrarse, aunque traiga el enlace', async () => {
    const invitacion = await invitarALaApp('llego-tarde@tape.test', new Date(Date.now() - 86_400_000))
    const token = await enlaces.paraLaApp(invitacion.id)

    await expect(
      auth.api.signUpEmail({
        headers: conEnlace(token),
        body: { name: 'Tarde', email: 'llego-tarde@tape.test', password: 'una-clave-larga' },
      }),
    ).rejects.toThrow(SIN_INVITACION)
  })
})

describe('sin el enlace no se entra', { timeout: HASHEO }, () => {
  // Quien sabía el correo de alguien invitado se registraba antes que esa persona y entraba a su
  // libro. Todas las formas de fallar dan la misma respuesta, para no revelar qué correos están
  // invitados.

  it('saber el correo invitado no alcanza', async () => {
    await enlaceALaApp('victima@tape.test')

    await expect(
      auth.api.signUpEmail({ body: { name: 'Intruso', email: 'victima@tape.test', password: 'una-clave-larga' } }),
    ).rejects.toThrow(SIN_INVITACION)
  })

  it('el enlace de otra persona tampoco', async () => {
    const tokenAjeno = await enlaceALaApp('otra@tape.test')
    await enlaceALaApp('objetivo@tape.test')

    await expect(
      auth.api.signUpEmail({
        headers: conEnlace(tokenAjeno),
        body: { name: 'Intruso', email: 'objetivo@tape.test', password: 'una-clave-larga' },
      }),
    ).rejects.toThrow(SIN_INVITACION)
  })

  it('el enlace de un libro no crea cuenta: las cuentas nuevas las habilita el admin', async () => {
    await prisma.bookInvitation.create({
      data: {
        id: 'inv_libro_no_registra',
        organizationId: LIBRO_DE_PRUEBA.bookId,
        email: 'ocupa@tape.test',
        role: 'viewer',
        expiresAt: new Date(Date.now() + 86_400_000),
        inviterId: LIBRO_DE_PRUEBA.userId,
      },
    })
    const token = (await enlaces.paraUnLibro('inv_libro_no_registra', LIBRO_DE_PRUEBA.bookId)) ?? ''

    await expect(
      auth.api.signUpEmail({
        headers: conEnlace(token),
        body: { name: 'Ocupa', email: 'ocupa@tape.test', password: 'una-clave-larga' },
      }),
    ).rejects.toThrow(SIN_INVITACION)
  })

  it('un token con otra forma no llega ni a la base', async () => {
    await enlaceALaApp('forma@tape.test')

    for (const token of ['{"not":""}', 'corto', 'x'.repeat(200)]) {
      await expect(
        auth.api.signUpEmail({
          headers: conEnlace(token),
          body: { name: 'Intruso', email: 'forma@tape.test', password: 'una-clave-larga' },
        }),
      ).rejects.toThrow(SIN_INVITACION)
    }
  })

  it('un token en el cuerpo, como filtro de Prisma, no sirve', async () => {
    await enlaceALaApp('cuerpo@tape.test')

    await expect(
      auth.api.signUpEmail({
        body: {
          name: 'Intruso',
          email: 'cuerpo@tape.test',
          password: 'una-clave-larga',
          token: { not: '' },
        } as never,
      }),
    ).rejects.toThrow(SIN_INVITACION)
  })
})

describe('aceptar una invitación a un libro', { timeout: HASHEO }, () => {
  // El correo no se verifica: cualquiera con cuenta podía invitar a un correo ajeno a su propio
  // libro, sacar ese enlace, registrarse con ese correo y aceptar la invitación que otra persona
  // le había hecho a ese correo. Aceptar exige el enlace de esa invitación.
  const invitar = async (id: string, organizationId: string, email: string) => {
    await prisma.bookInvitation.create({
      data: {
        id,
        organizationId,
        email,
        role: 'viewer',
        expiresAt: new Date(Date.now() + 86_400_000),
        inviterId: LIBRO_DE_PRUEBA.userId,
      },
    })
    return (await enlaces.paraUnLibro(id, organizationId)) ?? ''
  }

  const conSesion = async (email: string, token?: string) => {
    const headers = await entrar(email, 'una-clave-larga')
    if (token) headers.set(CABECERA_DEL_TOKEN, token)
    return headers
  }

  const aceptar = async (email: string, invitationId: string, token?: string) =>
    auth.api.acceptInvitation({ headers: await conSesion(email, token), body: { invitationId } })

  it('con el enlace de otra invitación al mismo correo no se entra al libro ajeno', async () => {
    await prisma.book.create({
      data: { id: 'lib_intruso', name: 'Intruso', slug: 'libro-del-intruso', createdAt: new Date() },
    })
    await invitar('inv_ajena_de_bob', LIBRO_DE_PRUEBA.bookId, 'bob@tape.test')
    const delIntruso = await invitar('inv_del_intruso', 'lib_intruso', 'bob@tape.test')
    await registrarConEnlace('bob@tape.test', 'Bob')

    await expect(aceptar('bob@tape.test', 'inv_ajena_de_bob', delIntruso)).rejects.toThrow(SIN_INVITACION)
    await expect(aceptar('bob@tape.test', 'inv_ajena_de_bob')).rejects.toThrow(SIN_INVITACION)
    const miembro = await prisma.bookMember.findFirst({
      where: { organizationId: LIBRO_DE_PRUEBA.bookId, authuser: { email: 'bob@tape.test' } },
    })
    expect(miembro).toBeNull()
  })

  it('con el enlace de esa invitación se entra', async () => {
    const token = await invitar('inv_de_carla', LIBRO_DE_PRUEBA.bookId, 'carla@tape.test')
    await registrarConEnlace('carla@tape.test', 'Carla')

    await aceptar('carla@tape.test', 'inv_de_carla', token)

    const miembro = await prisma.bookMember.findFirst({
      where: { organizationId: LIBRO_DE_PRUEBA.bookId, authuser: { email: 'carla@tape.test' } },
    })
    expect(miembro?.role).toBe('viewer')
  })

  it('rechazar con el enlace de otra invitación al mismo correo no sirve', async () => {
    await prisma.book.create({
      data: { id: 'lib_ajeno_eli', name: 'Ajeno', slug: 'libro-ajeno-eli', createdAt: new Date() },
    })
    await invitar('inv_de_eli', LIBRO_DE_PRUEBA.bookId, 'eli@tape.test')
    const otro = await invitar('inv_otra_de_eli', 'lib_ajeno_eli', 'eli@tape.test')
    await registrarConEnlace('eli@tape.test', 'Eli')

    await expect(
      auth.api.rejectInvitation({ headers: await conSesion('eli@tape.test', otro), body: { invitationId: 'inv_de_eli' } }),
    ).rejects.toThrow(SIN_INVITACION)
    const invitacion = await prisma.bookInvitation.findUniqueOrThrow({ where: { id: 'inv_de_eli' } })
    expect(invitacion.status).toBe('pending')
  })

  it('rechazar una invitación también exige su enlace', async () => {
    const token = await invitar('inv_de_dani', LIBRO_DE_PRUEBA.bookId, 'dani@tape.test')
    await registrarConEnlace('dani@tape.test', 'Dani')

    await expect(
      auth.api.rejectInvitation({ headers: await conSesion('dani@tape.test'), body: { invitationId: 'inv_de_dani' } }),
    ).rejects.toThrow(SIN_INVITACION)
    await auth.api.rejectInvitation({
      headers: await conSesion('dani@tape.test', token),
      body: { invitationId: 'inv_de_dani' },
    })

    const invitacion = await prisma.bookInvitation.findUniqueOrThrow({ where: { id: 'inv_de_dani' } })
    expect(invitacion.status).toBe('rejected')
  })
})

describe('las rutas de invitaciones de Better Auth', () => {
  // Las que solo leen o las usa quien invita dentro de su libro. Cualquier otra ruta con
  // «invitation» que traiga una versión nueva tiene que decidirse a mano: si responde una
  // invitación, va al gancho.
  const SIN_TOKEN = new Set([
    '/organization/invite-member',
    '/organization/cancel-invitation',
    '/organization/get-invitation',
    '/organization/list-invitations',
    '/organization/list-user-invitations',
  ])

  it('toda ruta que responde una invitación pasa por el gancho del token', () => {
    const rutas = Object.values(auth.api)
      .map((endpoint) => (endpoint as { path?: unknown }).path)
      .filter((ruta): ruta is string => typeof ruta === 'string' && ruta.includes('invitation'))

    expect(rutas.length).toBeGreaterThan(0)
    expect(rutas.filter((ruta) => !RESPONDER_UNA_INVITACION.has(ruta) && !SIN_TOKEN.has(ruta))).toEqual([])
  })
})

describe('el enlace desaparece antes de gastarlo', { timeout: HASHEO }, () => {
  // Gastar el enlace corre después de crear la cuenta. Si en el medio se renovó, la cuenta ya
  // existe y tiene que nacer igual con su libro personal.
  it('la cuenta nace con su libro personal', async () => {
    const invitacion = await prisma.accessInvitation.create({
      data: {
        email: 'renovada@tape.test',
        expiresAt: new Date(Date.now() + 86_400_000),
        createdBy: LIBRO_DE_PRUEBA.userId,
      },
    })
    const token = await enlaces.paraLaApp(invitacion.id)
    const renovaEnElMedio = prisma.$extends({
      query: {
        invitationLink: {
          async updateMany({ args, query }) {
            await enlaces.paraLaApp(invitacion.id)
            return query(args)
          },
        },
      },
    }) as unknown as PrismaClient
    const authConCarrera = crearAuth(
      renovaEnElMedio,
      loadEnv({ DATABASE_URL: postgres.url, AUTH_SECRET: 'x'.repeat(32) }),
      async () => {},
      async () => {},
      async () => {},
    )

    const { user } = await authConCarrera.api.signUpEmail({
      headers: conEnlace(token),
      body: { name: 'Renovada', email: 'renovada@tape.test', password: 'una-clave-larga' },
    })

    const personal = await prisma.bookMember.findFirst({ where: { userId: user.id, role: 'owner' } })
    expect(personal).not.toBeNull()
    // Y su invitación deja de figurar como pendiente: el correo ya tiene cuenta.
    const despues = await prisma.accessInvitation.findUniqueOrThrow({ where: { id: invitacion.id } })
    expect(despues.usedAt).not.toBeNull()
  })
})

describe('darse de baja', { timeout: HASHEO }, () => {
  // Los archivos del libro viven fuera de la base: sin este aviso, los de una cuenta que se va
  // quedaban para siempre en el almacenamiento.
  it('avisa qué libros se fueron con la cuenta', async () => {
    const { user } = await registrarConEnlace('se-va@tape.test', 'Se va')
    const personal = await prisma.bookMember.findFirstOrThrow({ where: { userId: user.id } })
    const headers = await entrar('se-va@tape.test', 'una-clave-larga')

    await auth.api.deleteUser({ headers, body: { password: 'una-clave-larga' } })

    expect(librosBorrados).toEqual([personal.organizationId])
  })
})
