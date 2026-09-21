import { describe, expect, it } from 'vitest'
import { conLibro, libroActual } from './libro-context.js'

const ctx = { bookId: 'lib_1', userId: 'usr_1', rol: 'editor' as const }

describe('contexto del libro', () => {
  it('adentro devuelve el libro', async () => {
    await conLibro(ctx, async () => {
      expect(libroActual().bookId).toBe('lib_1')
    })
  })

  it('afuera tira, no devuelve null', () => {
    // Es la regla que sostiene todo el aislamiento. Si devolviera undefined, la extensión de
    // Prisma armaría una consulta sin filtro y devolvería todos los libros.
    expect(() => libroActual()).toThrow(/sin libro/i)
  })

  it('los contextos anidados no se pisan', async () => {
    await conLibro(ctx, async () => {
      await conLibro({ ...ctx, bookId: 'lib_2' }, async () => {
        expect(libroActual().bookId).toBe('lib_2')
      })
      expect(libroActual().bookId).toBe('lib_1')
    })
  })

  it('sobrevive a un await, que es donde se pierde un contexto mal hecho', async () => {
    await conLibro(ctx, async () => {
      await new Promise((listo) => setTimeout(listo, 5))
      expect(libroActual().bookId).toBe('lib_1')
    })
  })

  it('dos contextos en paralelo no se mezclan', async () => {
    const [a, b] = await Promise.all([
      conLibro({ ...ctx, bookId: 'lib_a' }, async () => {
        await new Promise((listo) => setTimeout(listo, 10))
        return libroActual().bookId
      }),
      conLibro({ ...ctx, bookId: 'lib_b' }, async () => {
        await new Promise((listo) => setTimeout(listo, 1))
        return libroActual().bookId
      }),
    ])

    expect(a).toBe('lib_a')
    expect(b).toBe('lib_b')
  })

  it('sostiene el contexto hasta que una promesa perezosa se ejecute', async () => {
    // Prisma no ejecuta la consulta al construirla: `create()` devuelve una promesa que
    // recién corre cuando alguien la espera. Si `conLibro` devolviera esa promesa sin
    // esperarla, el contexto se cerraría antes de que la consulta llegue a mirarlo, y toda
    // escritura hecha así fallaría con «sin libro» aunque el llamador hiciera todo bien.
    //
    // Este thenable imita esa pereza: el trabajo pasa dentro de `then`, no al construirse.
    const perezosa = {
      then(resolver: (libro: string) => void) {
        resolver(libroActual().bookId)
      },
    }

    const leido = await conLibro(ctx, () => perezosa as unknown as Promise<string>)

    expect(leido).toBe('lib_1')
  })
})
