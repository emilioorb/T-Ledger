import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client.js'
import { loadEnv } from '../src/shared/config/env.js'
import { crearAuth } from '../src/modules/identity/infrastructure/auth.config.js'

// La primera cuenta no puede entrar por invitación: no hay nadie que invite. Este script
// existe para ese huevo y gallina, y hace falta de nuevo cada vez que el sistema se despliegue
// en otro lado, así que va versionado.
//
//   npx tsx scripts/crear-primer-usuario.ts correo@ejemplo.com "una contraseña larga" "Nombre"
//
// No inserta la contraseña a mano: se la pide al propio Better Auth para que quede con el
// mismo algoritmo y los mismos parámetros que va a usar al verificarla. Un hash escrito por
// fuera es una cuenta que no puede iniciar sesión y nadie entiende por qué.
const [correo, contrasena, nombre] = process.argv.slice(2)

if (!correo || !contrasena || !nombre) {
  console.error('Uso: npx tsx scripts/crear-primer-usuario.ts <correo> <contraseña> <nombre>')
  process.exit(1)
}

const env = loadEnv(process.env)
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: env.DATABASE_URL }) })
const auth = crearAuth(prisma, env, async () => {})

const contexto = await auth.$context
const hash = await contexto.password.hash(contrasena)

const usuario = await prisma.authUser.create({
  data: {
    id: crypto.randomUUID(),
    email: correo,
    name: nombre,
    emailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
})

await prisma.authAccount.create({
  data: {
    id: crypto.randomUUID(),
    accountId: usuario.id,
    providerId: 'credential',
    userId: usuario.id,
    password: hash,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
})

console.log(`Usuario ${correo} creado con id ${usuario.id}`)
console.log('Ahora iniciá sesión y creá tu primer libro: el plan de cuentas se siembra solo.')

await prisma.$disconnect()
