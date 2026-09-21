// Existe solo para el CLI de Better Auth, que necesita encontrar una instancia exportada
// llamada `auth` para poder derivar el esquema:
//
//   npx auth@latest generate --config src/modules/identity/infrastructure/auth.cli.ts
//
// La aplicación no importa este archivo: arma su instancia con `crearAuth` y el
// `PrismaService` que ya administra la conexión. Acá se crea un cliente aparte porque el CLI
// corre fuera de Nest y no tiene contenedor de dependencias.
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../../../generated/prisma/client.js'
import { loadEnv } from '../../../shared/config/env.js'
import { crearAuth } from './auth.config.js'

const env = loadEnv(process.env)

// Prisma 7 exige un driver adapter: `new PrismaClient()` pelado tira al construirse. Es el
// mismo `PrismaPg` que usa `PrismaService`.
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: env.DATABASE_URL }) })

export const auth = crearAuth(prisma, env)
