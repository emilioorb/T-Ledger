import { tryGetCurrentAuthEndpointContext } from '@better-auth/core/context'

// Quién está ejecutando la petición de Better Auth que corre ahora mismo.
//
// Existe por un hueco concreto: los `organizationHooks` saben **qué** cambia —el miembro, el
// rol nuevo, el libro— pero no **quién** lo cambia. El único usuario que reciben es el
// afectado, y anotarlo como autor diría que alguien se degradó o se expulsó a sí mismo. Con
// eso, el ADR-004 dejó sin registrar los dos caminos donde más importa saberlo.
//
// Better Auth corre cada endpoint dentro de su propio contexto de petición, y ahí el
// middleware de sesión del plugin de organizaciones ya dejó la sesión. Se lee de ahí, con la
// función que su documentación recomienda para esto. Antes se sembraba un AsyncLocalStorage
// propio desde el hook global con `enterWith`, que no llegaba hasta el gancho: medido, sacar a
// alguien de un libro daba 500 con «No se sabe quién quiso sacar a alguien del libro».
export const autorDeLaPeticion = (): string | undefined =>
  tryGetCurrentAuthEndpointContext()?.context.session?.user.id

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
