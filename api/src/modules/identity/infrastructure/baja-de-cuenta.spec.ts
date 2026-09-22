import { describe, expect, it } from 'vitest'
import { librosQueSeVanConLaCuenta } from './baja-de-cuenta.js'

// Lo que decide qué se destruye cuando alguien se borra la cuenta. Un error acá se paga de
// las dos formas posibles: borrando el libro de una familia que seguía usándolo, o dejando
// una base con plata adentro a la que nadie puede entrar.
describe('qué libros se van con la cuenta', () => {
  it('el libro del que era el único dueño se va con él', () => {
    expect(librosQueSeVanConLaCuenta([{ bookId: 'lib_1', duennos: 1 }])).toEqual(['lib_1'])
  })

  it('el libro que queda con otro dueño sigue en pie', () => {
    expect(librosQueSeVanConLaCuenta([{ bookId: 'lib_1', duennos: 2 }])).toEqual([])
  })

  it('con varios libros, cada uno se decide por su cuenta', () => {
    const libros = [
      { bookId: 'personal', duennos: 1 },
      { bookId: 'familia', duennos: 2 },
      { bookId: 'negocio', duennos: 1 },
    ]

    expect(librosQueSeVanConLaCuenta(libros)).toEqual(['personal', 'negocio'])
  })

  it('sin libros no se lleva nada puesto', () => {
    expect(librosQueSeVanConLaCuenta([])).toEqual([])
  })

  it('un conteo en cero tampoco deja el libro huérfano', () => {
    // No debería pasar —quien llega acá es dueño— pero si pasara, dejar el libro sin nadie
    // sería el peor de los dos errores.
    expect(librosQueSeVanConLaCuenta([{ bookId: 'raro', duennos: 0 }])).toEqual(['raro'])
  })
})
