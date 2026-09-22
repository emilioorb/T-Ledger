// Quién administra **la instancia**, que es otra cosa que ser dueño de un libro.
//
// El dueño de un libro manda adentro de su libro. El administrador de la instancia ve datos
// del servidor entero —cuánta gente hay— y por eso no se otorga desde la aplicación: se
// escribe en el entorno del servidor y hace falta reiniciarlo. Un superusuario que se pueda
// crear desde una pantalla es un superusuario que alguien puede conseguir.
export const leerAdmins = (lista: string | undefined): string[] =>
  (lista ?? '')
    .split(',')
    .map((correo) => correo.trim().toLowerCase())
    .filter(Boolean)

// Por correo y sin distinguir mayúsculas: es como la gente escribe su propia dirección, y
// `Emilio@` y `emilio@` son la misma casilla.
export const esAdmin = (correo: string | undefined, admins: readonly string[]): boolean =>
  correo !== undefined && admins.includes(correo.trim().toLowerCase())
