import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client.js'
import { LIBRO_DE_PRUEBA } from '../shared/libro/libro-de-prueba.js'

export interface RunningPostgres {
  url: string
  stop: () => Promise<void>
}

export const startPostgres = async (): Promise<RunningPostgres> => {
  const container: StartedPostgreSqlContainer = await new PostgreSqlContainer(
    'postgres:18-alpine',
  ).start()
  const url = container.getConnectionUri()

  execSync('npx prisma migrate deploy', {
    // fileURLToPath y no URL.pathname: en Windows este último devuelve "/C:/..." y no es un cwd válido.
    cwd: fileURLToPath(new URL('../..', import.meta.url)),
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'inherit',
  })

  // Todo lo que un test escribe cuelga de un libro y la llave foránea no acepta uno que no
  // exista. El libro de prueba es parte de dejar la base lista, igual que las migraciones:
  // sin él, cada archivo de test tendría que crearlo por su cuenta.
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) })
  await prisma.book.create({
    data: { id: LIBRO_DE_PRUEBA.bookId, name: 'Pruebas', slug: 'pruebas', createdAt: new Date() },
  })
  await prisma.$disconnect()

  return {
    url,
    stop: async () => {
      await container.stop()
    },
  }
}
