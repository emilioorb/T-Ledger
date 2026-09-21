import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { organization } from 'better-auth/plugins'
import type { PrismaClient } from '../../../generated/prisma/client.js'
import type { Env } from '../../../shared/config/env.js'
import { ac, roles } from './roles.js'

// Better Auth trae su propio modelo de datos y su propio router, que no pasan por el dominio
// hexagonal ni por el contrato Zod del resto de la app. Es el precio de no escribir a mano las
// sesiones, las invitaciones y los roles, y está aceptado en ADR-001.
//
// Su `organization` es nuestro libro. La palabra «organización» no sale de este archivo.
// Recibe el `PrismaClient` crudo y no el getter `client` de `PrismaService`. Es a propósito:
// las tablas de Better Auth tienen su propio modelo de pertenencia y no deben pasar por el
// filtro de libro que viene en la tarea 5. Pasarle el cliente sin extender es la forma de que
// nunca queden atrapadas en él por accidente.
export const crearAuth = (prisma: PrismaClient, env: Env) =>
  betterAuth({
    database: prismaAdapter(prisma, { provider: 'postgresql' }),
    secret: env.AUTH_SECRET,
    baseURL: env.AUTH_BASE_URL,
    emailAndPassword: {
      enabled: true,
      // Cerrado hasta que el producto se abra. Se entra por invitación y nada más, y por eso
      // 6a no construye verificación de correo, recuperación ni captcha: abrirlo el día que
      // toque es cambiar este booleano y prender lo que Better Auth ya trae (ADR-001).
      disableSignUp: true,
    },
    // Todos los modelos van renombrados, no solo el que choca. El que choca es `Account`: en
    // este proyecto es la **cuenta contable** del plan de cuentas, con `code`, `accountClass`
    // y `parentCode`, y Better Auth la quiere para guardar credenciales. Sin esto, su CLI
    // toma el plan de cuentas por suyo y lo reescribe.
    //
    // Los otros cuatro no chocan hoy pero podrían mañana, y renombrarlos todos tiene un
    // segundo beneficio: en `schema.prisma` se ve de un vistazo qué es de Better Auth y qué
    // es del dominio.
    user: { modelName: 'AuthUser' },
    session: { modelName: 'AuthSession' },
    account: { modelName: 'AuthAccount' },
    verification: { modelName: 'AuthVerification' },
    plugins: [
      organization({
        ac,
        roles,
        // Su `organization` es nuestro libro, así que se llama como lo que es.
        schema: {
          organization: { modelName: 'Book' },
          member: { modelName: 'BookMember' },
          invitation: { modelName: 'BookInvitation' },
        },
      }),
    ],
  })

export type Auth = ReturnType<typeof crearAuth>
