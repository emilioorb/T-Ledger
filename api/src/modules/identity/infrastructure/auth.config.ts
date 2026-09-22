import { betterAuth } from 'better-auth'
import { APIError } from 'better-auth/api'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { organization } from 'better-auth/plugins'
import type { PrismaClient } from '../../../generated/prisma/client.js'
import type { Env } from '../../../shared/config/env.js'
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
export const crearAuth = (
  prisma: PrismaClient,
  env: Env,
  alCrearLibro: (bookId: string) => Promise<void>,
) =>
  betterAuth({
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
      user: {
        create: {
          before: async (usuario) => {
            const [cuentas, invitaciones] = await Promise.all([
              prisma.authUser.count(),
              prisma.bookInvitation.findMany({
                where: { email: usuario.email },
                select: { status: true, expiresAt: true },
              }),
            ])

            const permitido = puedeRegistrarse(
              { esLaPrimeraCuenta: cuentas === 0, invitaciones },
              new Date(),
            )
            if (!permitido) throw new APIError('FORBIDDEN', { message: SIN_INVITACION })
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
    user: { modelName: 'authUser' },
    session: { modelName: 'authSession' },
    account: { modelName: 'authAccount' },
    verification: { modelName: 'authVerification' },
    plugins: [
      organization({
        ac,
        roles,
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
        },
      }),
    ],
  })

export type Auth = ReturnType<typeof crearAuth>
