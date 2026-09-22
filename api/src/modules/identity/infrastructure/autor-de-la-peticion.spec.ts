import { describe, expect, it } from 'vitest'
import {
  autorDeLaPeticion,
  entrarComoAutor,
  exigirAutor,
  SinAutorError,
} from './autor-de-la-peticion.js'

// Cada caso corre dentro de su propia cadena asíncrona, como una petición. Hace falta porque
// `enterWith` no envuelve nada: cambia el contexto actual y el de todo lo que cuelgue de él,
// así que sembrado directamente desde el test contaminaría los que vengan después.
const enUnaPeticion = <T>(correr: () => Promise<T>): Promise<T> =>
  new Promise((listo, falla) => {
    setTimeout(() => void correr().then(listo, falla), 0)
  })

// Esto es lo que sostiene la parte del ADR-004 que más importa: que un cambio de rol o una
// expulsión queden firmados por quien los hizo. El dato cruza desde el hook global de Better
// Auth hasta el gancho de organización sin que nadie lo pase de mano en mano, y si el cruce se
// rompe, el síntoma es una entrada firmada por la persona equivocada, que se ve igual de bien
// que una correcta.
describe('autor de la petición', () => {
  it('el gancho lee lo que sembró el hook, aunque nadie se lo pase', async () => {
    const visto = await enUnaPeticion(async () => {
      // El hook global, que sí tiene la sesión.
      entrarComoAutor('user-1')

      // Y el gancho de organización, más adentro y varios `await` después.
      await Promise.resolve()
      return Promise.resolve().then(() => autorDeLaPeticion())
    })

    expect(visto).toBe('user-1')
  })

  it('una petición no ve el autor de otra', async () => {
    await enUnaPeticion(async () => entrarComoAutor('user-1'))
    const otra = await enUnaPeticion(async () => autorDeLaPeticion())

    expect(otra).toBeUndefined()
  })

  it('exigir el autor sin autor corta en vez de inventarlo', async () => {
    await expect(enUnaPeticion(async () => exigirAutor('cambiar un rol'))).rejects.toThrow(
      SinAutorError,
    )
  })

  it('el error dice qué se quiso hacer, que es lo que se busca en un log', async () => {
    await expect(
      enUnaPeticion(async () => exigirAutor('sacar a alguien del libro')),
    ).rejects.toThrow(/sacar a alguien del libro/)
  })
})
