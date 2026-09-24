// Los tokens viven aparte del módulo a propósito. El módulo importa el middleware y el
// middleware necesita el token de la instancia de auth: si el token viviera en el módulo, eso
// sería un ciclo, y en ESM un ciclo no falla al compilar sino al arrancar, con un
// «Cannot access before initialization» que no dice de dónde viene.
//
// Un archivo de tokens no importa nada, así que no puede cerrar ningún ciclo.
export const AUTH = Symbol('auth')

export const LIBRO_CREADO = 'libro.creado'

export interface LibroCreado {
  bookId: string
}

// Después de borrar un libro, sea porque lo borró su dueño o porque se fue la cuenta que lo
// tenía. Quien guarda cosas del libro fuera de la base —los archivos— las limpia al oírlo.
export const LIBRO_BORRADO = 'libro.borrado'

export interface LibroBorrado {
  bookId: string
  // Quiénes eran sus miembros, leídos antes del borrado: después ya no hay a quién preguntarle.
  // Quien se quede sin libros por esto recibe uno propio.
  miembros: readonly string[]
}
