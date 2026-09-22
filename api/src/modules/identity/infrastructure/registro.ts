// Quién puede crear una cuenta.
//
// Tape Ledger no tiene registro abierto, pero «cerrado» no puede significar apagado: el
// invitado necesita una cuenta **antes** de poder aceptar la invitación, porque aceptarla es
// una llamada con sesión —Better Auth la resuelve bajo su middleware de sesión, no a partir
// del enlace—. Con el registro apagado del todo, el invitado no podía crear la cuenta y por lo
// tanto no podía aceptar nada: el flujo entero quedaba trabado contra sí mismo.
//
// Así que la puerta no está cerrada sino condicionada, que es lo que la propia documentación
// de Better Auth recomienda para este caso: `disableSignUp` sirve para apagar el registro, y
// para permitirlo *a veces* hay que decidirlo en el gancho de creación del usuario.
export interface InvitacionDelCorreo {
  status: string
  expiresAt: Date
}

interface Solicitud {
  // La primera cuenta de la instancia no la puede invitar nadie: no hay quien invite. Es la
  // persona que acaba de levantar su Tape Ledger, y dejarla afuera sería dejar la base vacía
  // para siempre.
  esLaPrimeraCuenta: boolean
  // Todas las invitaciones que existen para ese correo, en cualquier estado. La decisión de
  // cuáles sirven se toma acá y no en la consulta, para que se pueda probar sin base.
  invitaciones: InvitacionDelCorreo[]
}

const VIGENTE = 'pending'

export const puedeRegistrarse = ({ esLaPrimeraCuenta, invitaciones }: Solicitud, ahora: Date) =>
  esLaPrimeraCuenta ||
  invitaciones.some(({ status, expiresAt }) => status === VIGENTE && expiresAt > ahora)

// Lo mismo que le dice la pantalla de entrar a quien llega sin invitación. No distingue entre
// «no te invitaron», «tu invitación venció» y «ya la usaste»: las tres son la misma respuesta
// para quien está del otro lado, y separarlas convierte el registro en una forma de averiguar
// qué correos tienen invitación.
export const SIN_INVITACION =
  'Se entra por invitación. Si no tenés una, pedísela a quien lleva el libro.'
