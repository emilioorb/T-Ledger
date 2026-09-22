import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { conLibro } from '../../../shared/libro/libro-context.js'
import { LIBRO_DE_PRUEBA, entrarEnLibroDePrueba } from '../../../shared/libro/libro-de-prueba.js'
import { PrismaService } from '../../../shared/prisma/prisma.service.js'
import { startPostgres, type RunningPostgres } from '../../../test/postgres-container.js'
import { PrismaLibroRepository } from './prisma-libro.repository.js'

let postgres: RunningPostgres
let prisma: PrismaService
let repository: PrismaLibroRepository

const OTRO = { bookId: 'lib_ajeno', userId: 'usr_ajeno', rol: 'owner' } as const

const movimiento = (id: string, bookId: string) => ({
  id,
  bookId,
  date: new Date('2026-09-15T00:00:00.000Z'),
  kind: 'EXPENSE' as const,
  categoryId: 'cat-1',
  counterparty: 'Proveedor',
  amountMinor: 20_000_00n,
  currency: 'CRC',
  paymentAccountCode: '1101',
  status: 'ACTIVE' as const,
})

const categoria = (id: string, bookId: string) => ({
  id,
  bookId,
  name: 'Mercado',
  kind: 'EXPENSE' as const,
  sortOrder: 0,
  active: true,
})

beforeEach(entrarEnLibroDePrueba)

beforeAll(async () => {
  entrarEnLibroDePrueba()
  postgres = await startPostgres()
  prisma = new PrismaService(postgres.url)
  await prisma.$connect()
  repository = new PrismaLibroRepository(prisma)

  // El otro libro tiene que existir de verdad: las filas llevan clave foránea al libro.
  await prisma.book.create({
    data: { id: OTRO.bookId, name: 'Ajeno', slug: 'ajeno', createdAt: new Date() },
  })
}, 180_000)

afterAll(async () => {
  await prisma.$disconnect()
  await postgres.stop()
})

beforeEach(async () => {
  // Sin filtro de libro: acá se limpian los dos.
  await prisma.movement.deleteMany({ where: {} })
  await prisma.category.deleteMany({ where: {} })
})

describe('vaciar un libro', () => {
  it('borra lo anotado y devuelve cuánto se llevó', async () => {
    await prisma.movement.createMany({
      data: [
        movimiento('m1', LIBRO_DE_PRUEBA.bookId),
        movimiento('m2', LIBRO_DE_PRUEBA.bookId),
      ],
    })

    const resumen = await repository.vaciar()

    expect(resumen.movement).toBe(2)
    expect(await prisma.movement.count({ where: {} })).toBe(0)
  })

  it('conserva los catálogos: vaciar es quedarse con la libreta en blanco, no sin libreta', async () => {
    await prisma.category.create({ data: categoria('cat-1', LIBRO_DE_PRUEBA.bookId) })
    await prisma.movement.create({ data: movimiento('m1', LIBRO_DE_PRUEBA.bookId) })

    await repository.vaciar()

    expect(await prisma.category.count({ where: {} })).toBe(1)
  })

  it('no toca el libro de al lado', async () => {
    await prisma.movement.createMany({
      data: [movimiento('m1', LIBRO_DE_PRUEBA.bookId), movimiento('m2', OTRO.bookId)],
    })

    await repository.vaciar()

    // El `where` vacío evade el filtro de la extensión a propósito: es la única forma de
    // comprobar desde afuera que el vaciado respetó la frontera.
    const quedan = await prisma.movement.findMany({ where: {} })
    expect(quedan.map((fila) => fila.bookId)).toEqual([OTRO.bookId])
  })

  it('un libro sin nada no inventa un resumen', async () => {
    expect(await repository.vaciar()).toEqual({})
  })

  it('vaciar desde otro libro se lleva el de ese otro, no el de acá', async () => {
    await prisma.movement.createMany({
      data: [movimiento('m1', LIBRO_DE_PRUEBA.bookId), movimiento('m2', OTRO.bookId)],
    })

    await conLibro(OTRO, () => repository.vaciar())

    const quedan = await prisma.movement.findMany({ where: {} })
    expect(quedan.map((fila) => fila.bookId)).toEqual([LIBRO_DE_PRUEBA.bookId])
  })
})
