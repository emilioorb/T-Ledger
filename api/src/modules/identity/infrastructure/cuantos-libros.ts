// Cuántos libros puede tener una persona.
//
// El límite existe porque crear un libro es gratis y siembra un plan de cuentas entero: sin
// tope, una cuenta invitada a mirar el libro de la casa podría abrir libros hasta llenar la
// base. Tres alcanza para lo que el producto imagina —el personal, el de la casa, el de un
// negocio chico— y deja el abuso afuera.
//
// Cuenta los que la persona **posee**, no los que mira: que te inviten al libro de tu familia
// no te gasta un lugar propio.
export const LIBROS_POR_PERSONA = 3

export const puedeCrearLibro = (librosPropios: number): boolean =>
  librosPropios < LIBROS_POR_PERSONA

export const SIN_LUGAR = `Ya tenés ${LIBROS_POR_PERSONA} libros, que es el máximo.`
