import type { ResumenDeVaciado } from './vaciado.js'

// Un libro al que pertenece alguien, con lo que puede hacer adentro. El rol es el dato que
// el listado de Better Auth no trae y que la pantalla necesita para dos cosas: decir qué sos
// en cada uno y saber cuántos te gastan el cupo de tres.
export interface LibroPropio {
  id: string
  name: string
  role: string
  createdAt: Date
}

export interface LibroRepository {
  // Los libros de una persona. Va por el `userId` y no por el libro activo: es la única
  // consulta del producto que mira *fuera* del libro en el que estás parado.
  deLaPersona(userId: string): Promise<LibroPropio[]>

  // Borra lo anotado y deja los catálogos. Devuelve cuánto se llevó, por tabla: un botón
  // irreversible sin comprobante es un acto de fe.
  vaciar(): Promise<ResumenDeVaciado>

  // Borra el libro entero, con su gente, sus invitaciones y su registro. Con el candado de la
  // persona tomado: cuenta sus libros y decide `sePuede` adentro, así dos borrados a la vez no la
  // dejan sin ninguno. Devuelve quiénes eran sus miembros, o `null` si no se pudo borrar.
  borrar(
    bookId: string,
    userId: string,
    sePuede: (librosDeLaPersona: number) => boolean,
  ): Promise<{ miembros: string[] } | null>
}

export const LIBRO_REPOSITORY = Symbol('LIBRO_REPOSITORY')
