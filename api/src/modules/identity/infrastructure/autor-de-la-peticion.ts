import { AsyncLocalStorage } from 'node:async_hooks'

// Quién está ejecutando la petición de Better Auth que corre ahora mismo.
//
// Existe por un hueco concreto: los `organizationHooks` saben **qué** cambia —el miembro, el
// rol nuevo, el libro— pero no **quién** lo cambia. El único usuario que reciben es el
// afectado, y anotarlo como autor diría que alguien se degradó o se expulsó a sí mismo. Con
// eso, el ADR-004 dejó sin registrar los dos caminos donde más importa saberlo.
//
// El dato sí existe, un escalón más arriba: el hook global de Better Auth corre dentro de la
// petición y ahí se puede pedir la sesión. Se siembra ahí y se lee en el gancho, que vive en
// la misma cadena asíncrona. Es el mismo mecanismo con el que el libro viaja hasta los
// repositorios sin pasarse de mano en mano.
const almacen = new AsyncLocalStorage<string>()

// `enterWith` y no `run`: el hook global no envuelve al handler que viene después, lo precede.
// Es la misma razón por la que `entrarEnLibro` existe al lado de `conLibro`.
export const entrarComoAutor = (userId: string): void => almacen.enterWith(userId)

export const autorDeLaPeticion = (): string | undefined => almacen.getStore()

export class SinAutorError extends Error {
  constructor(que: string) {
    super(`No se sabe quién quiso ${que}: el cambio no se registra a ciegas.`)
    this.name = 'SinAutorError'
  }
}

// Sin autor no se registra: se corta. Es la misma regla que sostiene el resto del ADR-004,
// llevada al caso donde el dato podría faltar. Dejar pasar el cambio sin rastro rompe la
// promesa en silencio, y firmarlo con el afectado la rompe mintiendo: diría que alguien se
// degradó o se expulsó a sí mismo, y a un registro se le cree.
export const exigirAutor = (que: string): string => {
  const autor = autorDeLaPeticion()
  if (!autor) throw new SinAutorError(que)
  return autor
}
