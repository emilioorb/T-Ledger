import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { conLibro, type ContextoDeLibro } from '../libro/libro-context.js'
import { startPostgres, type RunningPostgres } from '../../test/postgres-container.js'
import { PrismaService } from './prisma.service.js'
import { LibroAjenoError } from './libro-filter.extension.js'

// Estos tests NO usan `conLibroDePrueba`: acá el libro es el sujeto de la prueba, y esconderlo
// detrás de un ayudante sería esconder justo lo que se está probando.
const enA: ContextoDeLibro = { bookId: 'lib_a', userId: 'u', rol: 'editor' }
const enB: ContextoDeLibro = { bookId: 'lib_b', userId: 'u', rol: 'editor' }

let postgres: RunningPostgres
let prisma: PrismaService

const crearCategoria = (ctx: ContextoDeLibro, nombre: string) =>
  conLibro(ctx, () =>
    prisma.client.category.create({
      data: { bookId: ctx.bookId, name: nombre, kind: 'EXPENSE' },
    }),
  )

beforeAll(async () => {
  postgres = await startPostgres()
  prisma = new PrismaService(postgres.url)

  // Los dos libros se crean sin filtro: `Book` no pertenece a ningún libro.
  for (const { bookId } of [enA, enB]) {
    await prisma.clientSinFiltroDeLibro.book.create({
      data: { id: bookId, name: bookId, slug: bookId, createdAt: new Date() },
    })
  }
  await crearCategoria(enA, 'Comida')
  await crearCategoria(enB, 'Comida')
}, 180_000)

afterAll(async () => {
  await prisma.$disconnect()
  await postgres.stop()
})

describe('aislamiento entre libros', () => {
  it('cada libro ve lo suyo y nada más', async () => {
    const deA = await conLibro(enA, () => prisma.client.category.findMany())
    const deB = await conLibro(enB, () => prisma.client.category.findMany())

    expect(deA).toHaveLength(1)
    expect(deB).toHaveLength(1)
    expect(deA[0]?.id).not.toBe(deB[0]?.id)
  })

  it('el mismo nombre existe en los dos libros, que es el punto de tener libros', async () => {
    const deA = await conLibro(enA, () => prisma.client.category.findMany())
    const deB = await conLibro(enB, () => prisma.client.category.findMany())

    expect(deA[0]?.name).toBe('Comida')
    expect(deB[0]?.name).toBe('Comida')
  })

  it('pedir por id algo del otro libro no lo devuelve', async () => {
    const [deB] = await conLibro(enB, () => prisma.client.category.findMany())
    const robado = await conLibro(enA, () =>
      prisma.client.category.findFirst({ where: { id: deB!.id } }),
    )

    expect(robado).toBeNull()
  })

  it('actualizar una fila del otro libro no toca nada', async () => {
    const [deB] = await conLibro(enB, () => prisma.client.category.findMany())
    const { count } = await conLibro(enA, () =>
      prisma.client.category.updateMany({ where: { id: deB!.id }, data: { name: 'Intervenida' } }),
    )

    expect(count).toBe(0)
  })

  it('borrar una fila del otro libro no borra nada', async () => {
    const [deB] = await conLibro(enB, () => prisma.client.category.findMany())
    const { count } = await conLibro(enA, () =>
      prisma.client.category.deleteMany({ where: { id: deB!.id } }),
    )

    expect(count).toBe(0)
  })

  it('escribir declarando otro libro se corta, en vez de corregirse en silencio', async () => {
    // La extensión verifica, no inyecta: si el código dice un libro y el contexto dice otro,
    // eso es un error de programación y taparlo lo dejaría vivo.
    await expect(
      conLibro(enA, () =>
        prisma.client.category.create({
          data: { bookId: enB.bookId, name: 'Colada', kind: 'EXPENSE' },
        }),
      ),
    ).rejects.toThrow(LibroAjenoError)
  })

  it('SIN CONTEXTO TIRA. Nunca devuelve todo', async () => {
    // El test más importante del archivo. Si algún día pasa a devolver filas en vez de tirar,
    // el aislamiento se cayó entero y ningún otro test de acá lo va a notar.
    await expect(prisma.client.category.findMany()).rejects.toThrow(/sin libro/i)
  })

  it('los tipos de cambio quedan fuera: son públicos e iguales para todos', async () => {
    await expect(prisma.client.exchangeRate.findMany()).resolves.toEqual([])
  })
})
