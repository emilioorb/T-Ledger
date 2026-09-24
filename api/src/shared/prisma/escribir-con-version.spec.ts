import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { EditadoPorOtroError, NotFoundError } from '../http/api-error.js'
import { entrarEnLibroDePrueba } from '../libro/libro-de-prueba.js'
import { startPostgres, type RunningPostgres } from '../../test/postgres-container.js'
import { condicionDeVersion, SUBIR_VERSION, verificarEscritura } from './escribir-con-version.js'
import { PrismaService } from './prisma.service.js'

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

const categoria = () =>
  prisma.client.category.create({ data: { bookId: prisma.libro, name: `c-${Math.random()}`, kind: 'EXPENSE' } })

// Lo que haría un repositorio: escribir con la versión que se leyó y verificar.
const renombrar = async (id: string, version: number | undefined, name: string) => {
  const { count } = await prisma.client.category.updateMany({
    where: { id, ...condicionDeVersion(version, 'renombrar una categoría') },
    data: { name, ...SUBIR_VERSION },
  })
  await verificarEscritura(count, async () => (await prisma.client.category.count({ where: { id } })) > 0)
}

describe('escribir con la versión que se leyó', () => {
  it('con la versión al día, escribe y la sube', async () => {
    const { id, version } = await categoria()

    await renombrar(id, version, 'nueva')

    expect(await prisma.client.category.findUnique({ where: { id } })).toMatchObject({ name: 'nueva', version: 1 })
  })

  it('con una versión vieja no pisa: responde que cambió mientras se editaba', async () => {
    const { id, version } = await categoria()
    await renombrar(id, version, 'primera')

    await expect(renombrar(id, version, 'segunda')).rejects.toBeInstanceOf(EditadoPorOtroError)
    expect((await prisma.client.category.findUnique({ where: { id } }))?.name).toBe('primera')
  })

  it('si ya no existe, dice que no existe y no que cambió', async () => {
    const { id, version } = await categoria()
    await prisma.client.category.delete({ where: { id } })

    await expect(renombrar(id, version, 'x')).rejects.toBeInstanceOf(NotFoundError)
  })

  it('sin versión (un cliente viejo) escribe como antes, y sube la versión igual', async () => {
    const { id } = await categoria()

    await renombrar(id, undefined, 'sin versión')

    expect(await prisma.client.category.findUnique({ where: { id } })).toMatchObject({
      name: 'sin versión',
      version: 1,
    })
  })
})
