// Toda cuenta tiene al menos un libro: sin ninguno, cada ruta del producto contesta 403 y la
// persona queda adentro sin poder hacer nada, ni siquiera crear otro. Así que el último no se
// borra; para empezar de cero está vaciarlo.
export const puedeBorrarse = (librosDeLaPersona: number): boolean => librosDeLaPersona > 1
