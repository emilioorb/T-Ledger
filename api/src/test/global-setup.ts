import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import type { TestProject } from 'vitest/node'
import { PrismaClient } from '../generated/prisma/client.js'
import { CHART_SEED } from '../modules/accounting/infrastructure/chart-seed.js'
import { LIBRO_DE_PRUEBA } from '../shared/libro/libro-de-prueba.js'

// Un solo Postgres para toda la suite. Antes cada archivo levantaba el suyo y lo migraba: con
// veinte archivos y ocho a la vez, los contenedores empezaron a no llegar a tiempo y la suite
// fallaba por timeouts de arranque que no tenían nada que ver con lo que se probaba. Acá se
// migra y se siembra una plantilla una vez, y cada archivo clona la suya (`startPostgres`).
export const PLANTILLA = 'plantilla'

let container: StartedPostgreSqlContainer | undefined

const conBase = (uri: string, base: string) => {
  const url = new URL(uri)
  url.pathname = `/${base}`
  return url.toString()
}

export async function setup(project: TestProject): Promise<void> {
  container = await new PostgreSqlContainer('postgres:18-alpine').start()
  const servidor = container.getConnectionUri()

  const admin = new pg.Client({ connectionString: servidor })
  await admin.connect()
  await admin.query(`CREATE DATABASE "${PLANTILLA}"`)
  await admin.end()

  const plantilla = conBase(servidor, PLANTILLA)
  execSync('npx prisma migrate deploy', {
    // fileURLToPath y no URL.pathname: en Windows este último devuelve "/C:/..." y no es un cwd válido.
    cwd: fileURLToPath(new URL('../..', import.meta.url)),
    env: { ...process.env, DATABASE_URL: plantilla },
    stdio: 'inherit',
  })
  await sembrar(plantilla)

  project.provide('postgresServidor', servidor)
}

export async function teardown(): Promise<void> {
  await container?.stop()
}

// Todo lo que un test escribe cuelga de un libro, y la llave foránea no acepta uno que no
// exista: el libro de prueba es parte de dejar la base lista, igual que las migraciones.
//
// Y la persona del libro, por la misma razón: desde el ADR-004 cada cambio escribe su rastro en
// la misma transacción, y el rastro apunta a quién lo hizo. Va con su membresía como dueño,
// igual que el contexto que usan los tests: un usuario suelto, sin libro, no existe en la app.
//
// Y el plan de cuentas, como cualquier libro real: sin él, todo caso de uso que valide contra una
// cuenta falla con un 422 que no tiene nada que ver con lo que se prueba. Por niveles, porque la
// llave foránea del árbol exige que la madre exista antes.
const sembrar = async (url: string): Promise<void> => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) })
  await prisma.book.create({
    data: { id: LIBRO_DE_PRUEBA.bookId, name: 'Pruebas', slug: 'pruebas', createdAt: new Date() },
  })
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
  const porNivel = [...CHART_SEED].sort((a, b) => a.code.localeCompare(b.code))
  for (const cuenta of porNivel) {
    await prisma.account.create({ data: { ...cuenta, bookId: LIBRO_DE_PRUEBA.bookId } })
  }
  // Sin conexiones abiertas: Postgres no clona una plantilla que alguien está usando.
  await prisma.$disconnect()
}

declare module 'vitest' {
  export interface ProvidedContext {
    postgresServidor: string
  }
}
