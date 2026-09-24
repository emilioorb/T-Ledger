import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { entrarEnLibroDePrueba } from '../libro/libro-de-prueba.js'
import { startPostgres, type RunningPostgres } from '../../test/postgres-container.js'
import { ChoqueDeTransaccionError } from './choque-de-transaccion.js'
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

beforeEach(async () => {
  entrarEnLibroDePrueba()
  await prisma.client.category.deleteMany({ where: { name: { startsWith: 'cupo-' } } })
})

// Las dos esperan a que la otra haya leído antes de escribir: así el choque pasa siempre, y
// no depende de cómo caigan los tiempos.
const barrera = (partes: number) => {
  let llegaron = 0
  let abrir: () => void = () => {}
  const abierta = new Promise<void>((listo) => (abrir = listo))
  return () => {
    llegaron += 1
    if (llegaron >= partes) abrir()
    return abierta
  }
}

describe('una transacción con dos escritores a la vez', () => {
  it('queda como si hubieran ido una detrás de la otra: el que choca reintenta y ve lo del otro', async () => {
    // Cada una mira si queda cupo y, si queda, lo toma. Con Read Committed las dos ven cupo y
    // las dos lo toman; serializable, una gana y la otra reintenta y ya no lo encuentra.
    const leyeron = barrera(2)
    let intentos = 0
    const tomarCupo = (quien: string) =>
      prisma.withTransaction(async () => {
        intentos += 1
        const tomados = await prisma.client.category.count({ where: { name: { startsWith: 'cupo-' } } })
        await leyeron()
        if (tomados === 0) {
          await prisma.client.category.create({ data: { bookId: prisma.libro, name: `cupo-${quien}`, kind: 'EXPENSE' } })
        }
      })

    await Promise.all([tomarCupo('a'), tomarCupo('b')])

    expect(await prisma.client.category.count({ where: { name: { startsWith: 'cupo-' } } })).toBe(1)
    expect(intentos).toBe(3)
  })

  it('si el choque se repite, se rinde a los tres intentos con un error propio', async () => {
    let intentos = 0
    const choque = Object.assign(new Error('could not serialize access'), { sqlState: '40001' })

    await expect(
      prisma.withTransaction(async () => {
        intentos += 1
        throw choque
      }),
    ).rejects.toBeInstanceOf(ChoqueDeTransaccionError)
    expect(intentos).toBe(3)
  })

  it('un error que no es un choque no se reintenta', async () => {
    let intentos = 0

    await expect(
      prisma.withTransaction(async () => {
        intentos += 1
        throw new Error('regla de negocio')
      }),
    ).rejects.toThrow('regla de negocio')
    expect(intentos).toBe(1)
  })

  it('una transacción anidada corre adentro de la de afuera y no reintenta por su cuenta', async () => {
    let internas = 0

    await prisma.withTransaction(async () => {
      await prisma.withTransaction(async () => {
        internas += 1
      })
    })

    expect(internas).toBe(1)
  })
})
