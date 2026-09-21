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
