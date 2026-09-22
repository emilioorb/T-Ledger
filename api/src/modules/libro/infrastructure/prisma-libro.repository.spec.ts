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

describe('borrar un libro', () => {
  // Un libro propio de este bloque: borrar el de prueba o el ajeno dejaría sin base a los
  // demás tests del archivo.
  const DESCARTABLE = 'lib_descartable'

  beforeEach(async () => {
    await prisma.clientSinFiltroDeLibro.book.create({
      data: { id: DESCARTABLE, name: 'Descartable', slug: 'descartable', createdAt: new Date() },
    })
  })

  it('se lleva el libro y todo lo que tenía adentro', async () => {
    await prisma.clientSinFiltroDeLibro.category.create({ data: categoria('cat-d', DESCARTABLE) })
    await prisma.clientSinFiltroDeLibro.movement.create({ data: movimiento('m-d', DESCARTABLE) })

    await repository.borrar(DESCARTABLE)

    expect(await prisma.clientSinFiltroDeLibro.book.findUnique({ where: { id: DESCARTABLE } })).toBeNull()
    expect(await prisma.clientSinFiltroDeLibro.movement.count({ where: { bookId: DESCARTABLE } })).toBe(0)
    expect(await prisma.clientSinFiltroDeLibro.category.count({ where: { bookId: DESCARTABLE } })).toBe(0)
  })

  it('no toca el libro de al lado', async () => {
    await prisma.clientSinFiltroDeLibro.movement.create({ data: movimiento('m-otro', OTRO.bookId) })

    await repository.borrar(DESCARTABLE)

    expect(await prisma.clientSinFiltroDeLibro.movement.count({ where: { bookId: OTRO.bookId } })).toBe(1)
  })

  // Una sesión parada en un libro que ya no existe contesta 403 a todo, y la persona no
  // entiende por qué. Soltarla deja que el middleware elija el libro que le queda.
  it('suelta las sesiones que lo tenían como activo', async () => {
    await prisma.clientSinFiltroDeLibro.authSession.create({
      data: {
        id: 'ses-d',
        token: 'tok-d',
        userId: LIBRO_DE_PRUEBA.userId,
        expiresAt: new Date(Date.now() + 86_400_000),
        activeOrganizationId: DESCARTABLE,
      },
    })

    await repository.borrar(DESCARTABLE)

    const sesion = await prisma.clientSinFiltroDeLibro.authSession.findUnique({ where: { id: 'ses-d' } })
    expect(sesion?.activeOrganizationId).toBeNull()
  })
})
