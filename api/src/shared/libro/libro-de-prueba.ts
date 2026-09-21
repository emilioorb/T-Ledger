import { conLibro, entrarEnLibro, type ContextoDeLibro } from './libro-context.js'

// El libro que usan los tests que no tienen nada que decir sobre libros. Son casi todos:
// prueban contabilidad y necesitan un libro cualquiera para poder correr, igual que necesitan
// una base.
export const LIBRO_DE_PRUEBA: ContextoDeLibro = {
  bookId: 'lib_test',
  userId: 'usr_test',
  rol: 'owner',
}

// Los tests que **sí** prueban aislamiento no usan esto: arman sus contextos a mano, porque
// ahí el libro es el sujeto de la prueba y esconderlo detrás de un ayudante sería esconder
// justo lo que se está probando.
export const conLibroDePrueba = <T>(correr: () => Promise<T>): Promise<T> =>
  conLibro(LIBRO_DE_PRUEBA, correr)

// Para poner en `beforeEach`. Ver la nota de `entrarEnLibro` sobre por qué acá no sirve
// `conLibroDePrueba`.
export const entrarEnLibroDePrueba = (): void => entrarEnLibro(LIBRO_DE_PRUEBA)
