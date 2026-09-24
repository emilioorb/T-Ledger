import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { entrarEnLibroDePrueba } from '../libro/libro-de-prueba.js'
import { PrismaService } from '../prisma/prisma.service.js'
import { startPostgres, type RunningPostgres } from '../../test/postgres-container.js'
import { errorDeLaBase } from './all-exceptions.filter.js'

let postgres: RunningPostgres
let prisma: PrismaService

beforeAll(async () => {
  postgres = await startPostgres()
  prisma = new PrismaService(postgres.url)
}, 180_000)

afterAll(async () => {
  await prisma.$disconnect()
  await postgres.stop()
})

beforeEach(entrarEnLibroDePrueba)

const capturar = async (hacer: () => Promise<unknown>): Promise<unknown> => {
  try {
    await hacer()
  } catch (error) {
    return error
  }
  throw new Error('No falló')
}

// Contra Postgres real y no con un error armado a mano: el choque de transacciones llegaba con
// una forma distinta de la que dice la documentación, y estos dos podrían también.
describe('los errores de la base, como llegan de verdad', () => {
  it('una fila repetida se reconoce como choque de unicidad', async () => {
    const categoria = { bookId: prisma.libro, name: 'Repetida', kind: 'EXPENSE' as const }
    await prisma.withTransaction(() => prisma.client.category.create({ data: categoria }))

    const error = await capturar(() => prisma.withTransaction(() => prisma.client.category.create({ data: categoria })))

    expect(errorDeLaBase(error)).toBe('unicidad')
  })

  it('una fila que no existe se reconoce como ausente', async () => {
    const error = await capturar(() =>
      prisma.withTransaction(() =>
        prisma.client.category.update({ where: { id: '00000000-0000-7000-8000-000000000000' }, data: { name: 'x' } }),
      ),
    )

    expect(errorDeLaBase(error)).toBe('ausente')
  })
})
