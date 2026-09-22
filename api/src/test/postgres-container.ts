import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client.js'
import { LIBRO_DE_PRUEBA } from '../shared/libro/libro-de-prueba.js'
import { CHART_SEED } from '../modules/accounting/infrastructure/chart-seed.js'

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

  // Y la persona del libro, por la misma razón: desde el ADR-004 cada cambio escribe su rastro
  // en la misma transacción, y el rastro apunta a quién lo hizo. Sin este usuario, cualquier
  // test que guarde algo muere con `ForeignKeyConstraintViolation` en una tabla de la que el
  // test no sabe nada.
  //
  // Va con su membresía como dueño, igual que el contexto que usan los tests: un usuario
  // suelto, sin libro, no es un estado que exista en la aplicación real.
  await prisma.authUser.create({
    data: {
      id: LIBRO_DE_PRUEBA.userId,
      name: 'Persona de prueba',
      email: 'pruebas@tape.test',
      updatedAt: new Date(),
    },
  })
  await prisma.bookMember.create({
    data: {
      id: 'mem_test',
      organizationId: LIBRO_DE_PRUEBA.bookId,
      userId: LIBRO_DE_PRUEBA.userId,
      role: LIBRO_DE_PRUEBA.rol,
      createdAt: new Date(),
    },
  })

  // Y nace con su plan de cuentas, como cualquier libro real: al crear uno de verdad lo
  // siembra el evento `libro.creado`. Sin esto, todo caso de uso que valide contra una cuenta
  // contable falla en los tests con un 422 que no tiene nada que ver con lo que se prueba.
  // Se inserta por niveles porque la llave foránea del árbol exige que la madre exista antes.
  const porNivel = [...CHART_SEED].sort((a, b) => a.code.localeCompare(b.code))
  for (const cuenta of porNivel) {
    await prisma.account.create({ data: { ...cuenta, bookId: LIBRO_DE_PRUEBA.bookId } })
  }

  await prisma.$disconnect()

  return {
    url,
    stop: async () => {
      await container.stop()
    },
  }
}
