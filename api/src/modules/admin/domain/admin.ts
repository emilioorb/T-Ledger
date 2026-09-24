// Quién administra **la instancia**, que es otra cosa que ser dueño de un libro.
//
// El dueño de un libro manda adentro de su libro. El administrador de la instancia ve datos
// del servidor entero —cuánta gente hay— y habilita las cuentas nuevas, y por eso no se
// otorga desde la aplicación: se escribe en el entorno del servidor y hace falta reiniciarlo.
// Un superusuario que se pueda crear desde una pantalla es un superusuario que alguien puede
// conseguir.
//
// Por id de usuario y no por correo: los correos no se verifican, y un correo de la lista que
// todavía no tuviera cuenta lo podía registrar cualquiera. El id no se elige ni se fabrica.
export const leerAdmins = (lista: string | undefined): string[] =>
  (lista ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)

export const esAdmin = (userId: string | undefined, admins: readonly string[]): boolean =>
  userId !== undefined && admins.includes(userId)
