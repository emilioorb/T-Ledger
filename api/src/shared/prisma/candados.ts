// Los espacios de los candados de la base (ADR-006): uno por libro y uno por persona. Van en el
// primer entero de `pg_advisory_xact_lock(espacio, clave)`, así las claves de uno nunca chocan con
// las del otro. Quien tiene el de un libro nunca espera el de una persona: no hay ciclo.
export const ESPACIO_DE_LIBROS = 624
export const ESPACIO_DE_PERSONAS = 625

// Lo que se espera un candado antes de rendirse, por omisión.
export const ESPERA_MAXIMA_DEL_CANDADO = '4s'
