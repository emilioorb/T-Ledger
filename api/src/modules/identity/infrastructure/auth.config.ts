import { betterAuth } from 'better-auth'
import { APIError, createAuthMiddleware, getSessionFromCtx } from 'better-auth/api'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { organization } from 'better-auth/plugins'
import type { PrismaClient } from '../../../generated/prisma/client.js'
import type { Env } from '../../../shared/config/env.js'
import { entrarComoAutor, exigirAutor } from './autor-de-la-peticion.js'
import { librosQueSeVanConLaCuenta } from './baja-de-cuenta.js'
import { puedeCrearLibro } from './cuantos-libros.js'
import { ac, roles } from './roles.js'
import { puedeRegistrarse, SIN_INVITACION } from './registro.js'

// Better Auth trae su propio modelo de datos y su propio router, que no pasan por el dominio
// hexagonal ni por el contrato Zod del resto de la app. Es el precio de no escribir a mano las
// sesiones, las invitaciones y los roles, y está aceptado en ADR-001.
//
// Su `organization` es nuestro libro. La palabra «organización» no sale de este archivo.
// Recibe el `PrismaClient` crudo y no el getter `client` de `PrismaService`. Es a propósito:
// las tablas de Better Auth tienen su propio modelo de pertenencia y no deben pasar por el
// filtro de libro que viene en la tarea 5. Pasarle el cliente sin extender es la forma de que
// nunca queden atrapadas en él por accidente.
// Lo que un cambio de gente le cuenta al registro. Viaja como datos y no como una llamada al
// rastro porque este archivo no conoce la auditoría: identidad avisa, y quien quiera anotarlo
// se suscribe, igual que con el libro recién creado.
export interface CambioDeMiembro {
  bookId: string
  // A quién le pasó. El rastro guarda la persona y no la fila de membresía: la fila se borra
  // al sacar a alguien, y entonces el rastro apuntaría a nada. En una invitación todavía no
  // hay persona, así que va el correo, que es lo único que existe de ella.
  aQuien: string
  // Y quién lo hizo, que es la pregunta del registro. Viaja explícito porque no se puede
  // deducir: los ganchos de organización no reciben la sesión.
  autorId: string
  accion: 'crear' | 'editar' | 'eliminar'
  antes?: object
  despues?: object
}

export const crearAuth = (
  prisma: PrismaClient,
  env: Env,
  alCrearLibro: (bookId: string) => Promise<void>,
  alCambiarMiembro: (cambio: CambioDeMiembro) => Promise<void>,
  // Los libros que se fueron con una cuenta dada de baja. Quien guarda cosas de un libro fuera
  // de la base —los archivos— las limpia al enterarse.
  alBorrarLibros: (bookIds: string[]) => Promise<void>,
) => {
  const auth = betterAuth({
    database: prismaAdapter(prisma, { provider: 'postgresql' }),
    secret: env.AUTH_SECRET,
    baseURL: env.AUTH_BASE_URL,
    // El front vive en otro puerto que la API, así que el navegador manda un `Origin` que no
    // es el `baseURL` y Better Auth lo rechaza con `INVALID_ORIGIN` —un 403 en cada intento de
    // entrar—. Va el mismo origen que ya se confía para CORS y no una lista aparte: dos listas
    // de orígenes permitidos se desincronizan el día que cambia el dominio, y la que quede
    // vieja rompe el ingreso.
    //
    // Lo que no se hace es apagar la comprobación con `disableOriginCheck`: eso desactiva
    // también la protección CSRF y deja pasar cualquier URL en las redirecciones.
    trustedOrigins: [env.CORS_ORIGIN],
    // Con qué IP cuenta el límite de peticiones. Better Auth solo mira `x-forwarded-for` y
    // descarta las cadenas con varios saltos, que es lo que llega detrás de Vercel y el borde
    // de Railway: sin esto, todo el mundo compartía un único cupo por ruta, y tres intentos de
    // entrar de cualquiera trababan el ingreso de todos. Medido en producción:
    // - por Vercel, la del cliente viene en `x-vercel-forwarded-for` (Vercel la reescribe
    //   aunque el cliente mande otra), y `x-real-ip` es la de salida de Vercel;
    // Directo a Railway ya no llega nada: `soloPorElProxy` lo rechaza antes, así que esta
    // cabecera siempre la puso Vercel y no quien llama.
    // https://www.better-auth.com/docs/concepts/rate-limit#connecting-ip-address
    advanced: {
      ipAddress: { ipAddressHeaders: ['x-vercel-forwarded-for'] },
    },
    // Quién ejecuta, guardado antes de que corra el endpoint. Es lo que les falta a los
    // ganchos de organización para poder firmar un cambio de rol o una expulsión: ellos
    // reciben al afectado, no a la sesión. Acá sí se puede pedir, y el gancho corre en la
    // misma cadena asíncrona de esta petición.
    //
    // No corta nada si no hay sesión: entrar y registrarse pasan por acá, y ahí todavía no
    // hay nadie. Quien necesite el autor lo exige por su cuenta.
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        const sesion = await getSessionFromCtx(ctx).catch(() => null)
        if (sesion) entrarComoAutor(sesion.user.id)
      }),
    },
    emailAndPassword: {
      enabled: true,
    },
    // La puerta está condicionada, no cerrada. `disableSignUp` apaga el registro entero, y eso
    // dejaba al invitado sin poder crear la cuenta que necesita para aceptar su invitación:
    // el flujo trabado contra sí mismo. Para permitir el registro *a veces*, la documentación
    // de Better Auth manda decidirlo acá, en el gancho de creación del usuario.
    //
    // Las dos consultas van contra el cliente crudo a propósito, igual que el resto de este
    // archivo: las tablas de Better Auth no pasan por el filtro de libro, y acá todavía no hay
    // libro que filtrar —la persona ni siquiera existe—.
    databaseHooks: {
      // Toda sesión nace parada en un libro. Sin esto, quien tiene dos o más recibía 403 en cada
      // consulta hasta que el navegador elegía uno, y la pantalla quedaba vacía mientras tanto.
      // El más viejo porque es el personal, que es de donde parte todo el mundo.
      session: {
        create: {
          before: async (sesion) => {
            const primera = await prisma.bookMember.findFirst({
              where: { userId: sesion.userId },
              orderBy: { createdAt: 'asc' },
              select: { organizationId: true },
            })
            return { data: { ...sesion, activeOrganizationId: primera?.organizationId ?? null } }
          },
        },
      },
      user: {
        create: {
          before: async (usuario) => {
            const [cuentas, aUnLibro, aLaApp] = await Promise.all([
              prisma.authUser.count(),
              prisma.bookInvitation.findMany({
                where: { email: usuario.email },
                select: { status: true, expiresAt: true },
              }),
              prisma.accessInvitation.findMany({
                where: { email: usuario.email },
                select: { usedAt: true, expiresAt: true },
              }),
            ])

            // Las dos invitaciones abren la misma puerta; la de la app no mete a nadie en un
            // libro. Una gastada cuenta como aceptada, igual que la de un libro.
            const invitaciones = [
              ...aUnLibro,
              ...aLaApp.map(({ usedAt, expiresAt }) => ({
                status: usedAt ? 'accepted' : 'pending',
                expiresAt,
              })),
            ]
            const permitido = puedeRegistrarse(
              { esLaPrimeraCuenta: cuentas === 0, invitaciones },
              new Date(),
            )
            if (!permitido) throw new APIError('FORBIDDEN', { message: SIN_INVITACION })
          },
          // Toda cuenta nace con su libro personal, venga o no de una invitación: entrar a un
          // libro ajeno no reemplaza tener el propio. Va por la API de organizaciones y no
          // directo a la base para que corra `afterCreateOrganization` y el libro salga con
          // su plan de cuentas. El slug lleva el id porque es único en toda la instancia.
          after: async (usuario) => {
            // La invitación a la app sirve una sola vez: se gasta con la cuenta que abrió.
            await prisma.accessInvitation.updateMany({
              where: { email: usuario.email, usedAt: null },
              data: { usedAt: new Date() },
            })
            await auth.api.createOrganization({
              body: { name: 'Personal', slug: `personal-${usuario.id}`, userId: usuario.id },
            })
          },
        },
      },
    },
    // Los nombres van en camelCase y no en PascalCase porque Better Auth no compara contra el
    // nombre del modelo de Prisma sino contra **la propiedad del cliente**: su adaptador lee el
    // modelo de datos y convierte `AuthUser` en `authUser` antes de comparar. Con PascalCase la
    // comparación no coincide nunca y arranca diciendo que faltan tablas que sí existen.
    //
    // Todos los modelos van renombrados, no solo el que choca. El que choca es `Account`: en
    // este proyecto es la **cuenta contable** del plan de cuentas, con `code`, `accountClass`
    // y `parentCode`, y Better Auth la quiere para guardar credenciales. Sin esto, su CLI
    // toma el plan de cuentas por suyo y lo reescribe.
    //
    // Los otros cuatro no chocan hoy pero podrían mañana, y renombrarlos todos tiene un
    // segundo beneficio: en `schema.prisma` se ve de un vistazo qué es de Better Auth y qué
    // es del dominio.
    user: {
      modelName: 'authUser',
      // Darse de baja se pide desde la pantalla de cuenta y hay que habilitarlo acá: Better
      // Auth lo trae apagado, que es lo correcto para algo irreversible.
      deleteUser: {
        enabled: true,
        // Un libro sin dueño no es un libro archivado: es una base con la plata de alguien
        // adentro y nadie que pueda entrar. Así que el libro del que se va su único dueño se
        // va con él, y el `onDelete: Cascade` del esquema se lleva todo lo que colgaba.
        //
        // Corre **antes** del borrado, que es la única forma de que un fallo acá deje la
        // cuenta en pie: al revés quedaría la persona borrada y su libro huérfano, que es
        // exactamente lo que esto evita.
        beforeDelete: async (usuario) => {
          const membresias = await prisma.bookMember.findMany({
            where: { userId: usuario.id, role: 'owner' },
            select: { organizationId: true },
          })

          const libros = await Promise.all(
            membresias.map(async ({ organizationId }) => ({
              bookId: organizationId,
              duennos: await prisma.bookMember.count({
                where: { organizationId, role: 'owner' },
              }),
            })),
          )

          const aBorrar = librosQueSeVanConLaCuenta(libros)
          if (aBorrar.length > 0) {
            await prisma.book.deleteMany({ where: { id: { in: aBorrar } } })
            await alBorrarLibros(aBorrar)
          }
        },
      },
    },
    session: { modelName: 'authSession' },
    account: { modelName: 'authAccount' },
    verification: { modelName: 'authVerification' },
    plugins: [
      organization({
        ac,
        roles,
        // Cualquiera con cuenta puede abrir un libro, hasta tres. Se cuentan los que posee y
        // no los que mira: que te inviten al libro de tu familia no te gasta un lugar propio.
        //
        // La comprobación vive acá y no en la pantalla porque una pantalla no protege nada:
        // el endpoint de crear organización de Better Auth es público para cualquier sesión.
        allowUserToCreateOrganization: async (usuario) => {
          const propios = await prisma.bookMember.count({
            where: { userId: usuario.id, role: 'owner' },
          })
          return puedeCrearLibro(propios)
        },
        // Su `organization` es nuestro libro, así que se llama como lo que es.
        schema: {
          organization: { modelName: 'book' },
          member: { modelName: 'bookMember' },
          invitation: { modelName: 'bookInvitation' },
        },
        organizationHooks: {
          // Un libro sin plan de cuentas no sirve para nada: no se puede anotar un solo
          // movimiento. Sembrarlo acá es lo que hace que crear un libro entregue algo usable
          // en vez de una base vacía que el usuario tiene que llenar sin saber cómo.
          afterCreateOrganization: async ({ organization }) => {
            await alCrearLibro(organization.id)
          },

          // Los ganchos **before** y no los **after**, aunque el cambio todavía no haya
          // ocurrido cuando corren. Es la única forma de cumplir el ADR-004 acá: el código de
          // Better Auth encola los `after` y los ejecuta después del commit, fuera de la
          // transacción, y deja dicho que un fallo ahí «no puede revertir el trabajo ya
          // confirmado». Con un `after`, a alguien lo podrían sacar del libro sin que quede
          // registrado, que es justo lo que el ADR rechazó cuando descartó escribir el rastro
          // con un evento.
          //
          // Desde un `before`, si el rastro falla se lanza y Better Auth aborta: no hay cambio
          // sin rastro. La garantía inversa —ningún rastro sin cambio— es la que se cede, y
          // está escrita en el ADR: la transacción de Better Auth es interna y su propio
          // código dice que nunca se expone, así que nuestra escritura no puede entrar en
          // ella.
          // Sobre gente se registran los cinco caminos. Los ganchos de organización reciben a
          // la persona afectada y no a la sesión que ejecuta, así que en los dos últimos el
          // autor lo pone `autorDeLaPeticion`, sembrado por el hook global de arriba. Antes
          // quedaban sin registrar justamente por eso: anotar al afectado como autor diría
          // que alguien se degradó o se expulsó a sí mismo, y un registro que miente sobre
          // quién hizo el cambio es peor que uno que no lo tiene, porque se le cree.
          //
          // Son ganchos **before** y no **after** a propósito: el código de Better Auth encola
          // los `after` y los corre después del commit, fuera de la transacción, y deja dicho
          // que un fallo ahí «no puede revertir el trabajo ya confirmado». Desde un `before`,
          // si el rastro falla la operación se aborta, y no queda cambio sin registrar.
          beforeCreateInvitation: async ({ invitation, inviter, organization }) => {
            await alCambiarMiembro({
              bookId: organization.id,
              aQuien: invitation.email,
              autorId: inviter.id,
              accion: 'crear',
              despues: { invitado: invitation.email, rol: invitation.role },
            })
          },

          // Acá el autor y el afectado son la misma persona, y es verdad: nadie acepta una
          // invitación por otro. Aceptar tampoco pasa por `beforeAddMember` —Better Auth crea
          // esa membresía llamando directo a su adaptador—, así que sin este gancho el camino
          // más común de todos no dejaría rastro. Medido: la invitada entró y el registro
          // quedó vacío.
          beforeAcceptInvitation: async ({ invitation, user, organization }) => {
            await alCambiarMiembro({
              bookId: organization.id,
              aQuien: user.id,
              autorId: user.id,
              accion: 'editar',
              despues: { entro: user.name, correo: user.email, rol: invitation.role },
            })
          },

          beforeCancelInvitation: async ({ invitation, cancelledBy, organization }) => {
            await alCambiarMiembro({
              bookId: organization.id,
              aQuien: invitation.email,
              autorId: cancelledBy.id,
              accion: 'eliminar',
              antes: { invitado: invitation.email, rol: invitation.role },
            })
          },

          beforeUpdateMemberRole: async ({ member, newRole, user, organization }) => {
            await alCambiarMiembro({
              bookId: organization.id,
              aQuien: user.id,
              autorId: exigirAutor('cambiar un rol'),
              accion: 'editar',
              antes: { quien: user.name, rol: member.role },
              despues: { quien: user.name, rol: newRole },
            })
          },

          beforeRemoveMember: async ({ member, user, organization }) => {
            await alCambiarMiembro({
              bookId: organization.id,
              aQuien: user.id,
              autorId: exigirAutor('sacar a alguien del libro'),
              accion: 'eliminar',
              antes: { quien: user.name, correo: user.email, rol: member.role },
            })
          },
        },
      }),
    ],
  })
  return auth
}

export type Auth = ReturnType<typeof crearAuth>
