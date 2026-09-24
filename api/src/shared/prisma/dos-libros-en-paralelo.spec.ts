import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { conLibro, type ContextoDeLibro } from '../libro/libro-context.js'
import { LIBRO_DE_PRUEBA } from '../libro/libro-de-prueba.js'
import { startPostgres, type RunningPostgres } from '../../test/postgres-container.js'
import { PrismaService } from './prisma.service.js'

let postgres: RunningPostgres
let prisma: PrismaService

const OTRO_LIBRO: ContextoDeLibro = { bookId: 'lib_paralelo', userId: 'usr_test', rol: 'owner' }
const RONDAS = 20

beforeAll(async () => {
  postgres = await startPostgres()
  prisma = new PrismaService(postgres.url)
  await prisma.clientSinFiltroDeLibro.book.create({
    data: { id: OTRO_LIBRO.bookId, name: 'Paralelo', slug: 'libro-paralelo', createdAt: new Date() },
  })
}, 180_000)

afterAll(async () => {
  await prisma.$disconnect()
  await postgres.stop()
})

// Las dos transacciones leen antes de que cualquiera escriba: así, si Serializable confundiera
// los libros, el choque aparecería siempre y no según cómo caigan los tiempos.
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

describe('dos libros escribiendo a la vez', () => {
  // El riesgo del supuesto 2 de la spec: Serializable bloquea por predicado, y con un plan que
  // recorre la tabla entera, dos familias que no se tocan podrían chocar igual. Acá se cuenta:
  // si un libro tuviera que reintentar por culpa del otro, habría más intentos que operaciones.
  it(`en ${RONDAS} rondas, ninguno reintenta por culpa del otro`, async () => {
    let intentos = 0

    for (let ronda = 0; ronda < RONDAS; ronda += 1) {
      const leyeron = barrera(2)
      const escribir = (libro: ContextoDeLibro) =>
        conLibro(libro, () =>
          prisma.withTransaction(async () => {
            intentos += 1
            const cuantas = await prisma.client.category.count({ where: { kind: 'EXPENSE' } })
            await leyeron()
            await prisma.client.category.create({
              data: { bookId: libro.bookId, name: `ronda-${ronda}-${cuantas}`, kind: 'EXPENSE' },
            })
          }),
        )

      await Promise.all([escribir(LIBRO_DE_PRUEBA), escribir(OTRO_LIBRO)])
    }

    expect(intentos).toBe(RONDAS * 2)
  })
})
