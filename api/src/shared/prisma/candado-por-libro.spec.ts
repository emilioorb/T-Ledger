import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { conLibro, type ContextoDeLibro } from '../libro/libro-context.js'
import { LIBRO_DE_PRUEBA } from '../libro/libro-de-prueba.js'
import { startPostgres, type RunningPostgres } from '../../test/postgres-container.js'
import { ChoqueDeTransaccionError } from './choque-de-transaccion.js'
import { PrismaService } from './prisma.service.js'

let postgres: RunningPostgres
let prisma: PrismaService

const OTRO_LIBRO: ContextoDeLibro = { bookId: 'lib_candado', userId: 'usr_test', rol: 'owner' }
const enElLibro = <T>(correr: () => Promise<T>) => conLibro(LIBRO_DE_PRUEBA, correr)
const esperar = (ms: number) => new Promise((listo) => setTimeout(listo, ms))

beforeAll(async () => {
  postgres = await startPostgres()
  // Un tope de espera corto para que el test del tope no tarde.
  prisma = new PrismaService(postgres.url, { esperaMaximaDelCandado: '500ms' })
  await prisma.clientSinFiltroDeLibro.book.create({
    data: { id: OTRO_LIBRO.bookId, name: 'Candado', slug: 'libro-candado', createdAt: new Date() },
  })
}, 180_000)

afterAll(async () => {
  await prisma.$disconnect()
  await postgres.stop()
})

beforeEach(async () => {
  await prisma.clientSinFiltroDeLibro.category.deleteMany({ where: { name: { startsWith: 'cupo-' } } })
})

describe('dos escritores en el mismo libro', () => {
  it('van en fila: el segundo ve lo que escribió el primero, sin reintentar', async () => {
    // Cada uno mira si queda cupo y, si queda, lo toma. Sin candado los dos lo veían libre y los
    // dos lo tomaban; en fila, el segundo ya lo encuentra tomado.
    let intentos = 0
    const tomarCupo = (quien: string) =>
      enElLibro(() =>
        prisma.withTransaction(async () => {
          intentos += 1
          const tomados = await prisma.client.category.count({ where: { name: { startsWith: 'cupo-' } } })
          await esperar(150)
          if (tomados === 0) {
            await prisma.client.category.create({ data: { bookId: prisma.libro, name: `cupo-${quien}`, kind: 'EXPENSE' } })
          }
        }),
      )

    await Promise.all([tomarCupo('a'), tomarCupo('b')])

    expect(await enElLibro(() => prisma.client.category.count({ where: { name: { startsWith: 'cupo-' } } }))).toBe(1)
    expect(intentos).toBe(2)
  })

  it('si la espera pasa su tope, responde que hay que probar de nuevo', async () => {
    let soltar: () => void = () => {}
    const retenido = new Promise<void>((listo) => (soltar = listo))
    let tomado: () => void = () => {}
    const yaTomo = new Promise<void>((listo) => (tomado = listo))

    const primero = enElLibro(() =>
      prisma.withTransaction(async () => {
        tomado()
        await retenido
      }),
    )
    await yaTomo
    const segundo = enElLibro(() => prisma.withTransaction(async () => undefined))

    try {
      await expect(segundo).rejects.toBeInstanceOf(ChoqueDeTransaccionError)
    } finally {
      soltar()
      await primero
    }
  })
})

describe('la fila de un libro', () => {
  it('pasado su tope, la escritura se rechaza enseguida, sin pedir conexión ni esperar el candado', async () => {
    let soltar: () => void = () => {}
    const retenido = new Promise<void>((listo) => (soltar = listo))
    let tomado: () => void = () => {}
    const yaTomo = new Promise<void>((listo) => (tomado = listo))
    const primera = enElLibro(() =>
      prisma.withTransaction(async () => {
        tomado()
        await retenido
      }),
    )
    await yaTomo

    const siguientes = [1, 2, 3].map(() => enElLibro(() => prisma.withTransaction(async () => undefined)))
    const rechazada = await Promise.race([siguientes[2]!.then(() => 'entró', () => 'rechazada'), esperar(300).then(() => 'esperando')])
    soltar()
    await primera
    const resultados = await Promise.allSettled(siguientes)

    expect(rechazada).toBe('rechazada')
    expect(resultados.map((r) => r.status)).toEqual(['fulfilled', 'fulfilled', 'rejected'])
  })
})

describe('dos instancias del servicio', () => {
  it('una no toma prestada la transacción de la otra: abre la suya y espera el candado', async () => {
    const otra = new PrismaService(postgres.url, { esperaMaximaDelCandado: '500ms' })
    try {
      await expect(
        enElLibro(() => prisma.withTransaction(() => otra.withTransaction(async () => undefined))),
      ).rejects.toBeInstanceOf(ChoqueDeTransaccionError)
    } finally {
      await otra.$disconnect()
    }
  })
})

describe('dos libros distintos', () => {
  it('no se esperan: uno que retiene su candado no demora al otro', async () => {
    let soltar: () => void = () => {}
    const retenido = new Promise<void>((listo) => (soltar = listo))
    let tomado: () => void = () => {}
    const yaTomo = new Promise<void>((listo) => (tomado = listo))

    const unLibro = enElLibro(() =>
      prisma.withTransaction(async () => {
        tomado()
        await retenido
      }),
    )
    await yaTomo

    const inicio = Date.now()
    try {
      await conLibro(OTRO_LIBRO, () =>
        prisma.withTransaction(() =>
          prisma.client.category.create({ data: { bookId: OTRO_LIBRO.bookId, name: 'cupo-otro', kind: 'EXPENSE' } }),
        ),
      )
    } finally {
      soltar()
      await unLibro
    }
    const demora = Date.now() - inicio

    expect(demora).toBeLessThan(400)
  })
})

describe('lo que no es de un libro', () => {
  it('corre sin candado: la sincronización del tipo de cambio no tiene libro', async () => {
    const resultado = await prisma.withTransaction(async () => 'sin libro')

    expect(resultado).toBe('sin libro')
  })
})

describe('reintentos', () => {
  it('un deadlock se reintenta, y si se repite se rinde a los tres intentos con un error propio', async () => {
    let intentos = 0
    const deadlock = Object.assign(new Error('deadlock detected'), { sqlState: '40P01' })

    await expect(
      enElLibro(() =>
        prisma.withTransaction(async () => {
          intentos += 1
          throw deadlock
        }),
      ),
    ).rejects.toBeInstanceOf(ChoqueDeTransaccionError)
    expect(intentos).toBe(3)
  })

  it('un error que no es un choque no se reintenta', async () => {
    let intentos = 0

    await expect(
      enElLibro(() =>
        prisma.withTransaction(async () => {
          intentos += 1
          throw new Error('regla de negocio')
        }),
      ),
    ).rejects.toThrow('regla de negocio')
    expect(intentos).toBe(1)
  })

  it('una transacción anidada corre adentro de la de afuera y no toma otro candado', async () => {
    let internas = 0

    await enElLibro(() =>
      prisma.withTransaction(async () => {
        await prisma.withTransaction(async () => {
          internas += 1
        })
      }),
    )

    expect(internas).toBe(1)
  })
})
