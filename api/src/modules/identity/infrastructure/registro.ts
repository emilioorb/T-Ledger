import { createHash, randomBytes } from 'node:crypto'

// Quién puede crear una cuenta.
//
// T-Ledger no tiene registro abierto, pero «cerrado» no puede significar apagado: el
// invitado necesita una cuenta **antes** de poder aceptar la invitación, porque aceptarla es
// una llamada con sesión —Better Auth la resuelve bajo su middleware de sesión, no a partir
// del enlace—. Con el registro apagado del todo, el invitado no podía crear la cuenta y por lo
// tanto no podía aceptar nada: el flujo entero quedaba trabado contra sí mismo.
//
// Así que la puerta no está cerrada sino condicionada, que es lo que la propia documentación
// de Better Auth recomienda para este caso: `disableSignUp` sirve para apagar el registro, y
// para permitirlo *a veces* hay que decidirlo en el gancho de creación del usuario.
//
// La condición es **tener el enlace de una invitación a la app**, no que el correo esté invitado:
// quien sabía el correo de alguien invitado se registraba antes que esa persona. Y solo el de la
// app, que da el admin: el de un libro lo puede sacar cualquiera con cuenta para un correo ajeno,
// y registrarse con él ocuparía el correo de otra persona
// (docs/plans/2026-09-23-invitaciones-con-token.md).

// Lo que el registro encuentra a partir del token que trae el pedido.
export interface EnlaceDeInvitacion {
  tipo: 'APP' | 'LIBRO'
  email: string
  expiresAt: Date
  usedAt: Date | null
  // Que la invitación a la que pertenece siga esperando: no cancelada ni aceptada.
  invitacionVigente: boolean
}

interface Solicitud {
  // La primera cuenta de la instancia no la puede invitar nadie: no hay quien invite. Es la
  // persona que acaba de levantar su T-Ledger, y dejarla afuera sería dejar la base vacía
  // para siempre.
  esLaPrimeraCuenta: boolean
  email: string
  enlace: EnlaceDeInvitacion | null
}

const normalizar = (correo: string) => correo.trim().toLowerCase()

export const puedeRegistrarse = ({ esLaPrimeraCuenta, email, enlace }: Solicitud, ahora: Date): boolean =>
  esLaPrimeraCuenta ||
  (enlace !== null &&
    enlace.tipo === 'APP' &&
    normalizar(enlace.email) === normalizar(email) &&
    enlace.usedAt === null &&
    enlace.expiresAt > ahora &&
    enlace.invitacionVigente)

// 32 bytes al azar en base64url: 43 caracteres, sin relleno.
const BYTES_DEL_TOKEN = 32
const FORMA_DEL_TOKEN = /^[A-Za-z0-9_-]{43}$/

export const generarToken = (): string => randomBytes(BYTES_DEL_TOKEN).toString('base64url')

// El token llega del pedido y se usa en una consulta: tiene que ser texto con la forma exacta.
// Un objeto (`{ not: '' }`) usado como filtro de Prisma encontraría la invitación sin saberlo.
export const esToken = (valor: unknown): valor is string =>
  typeof valor === 'string' && FORMA_DEL_TOKEN.test(valor)

// En la base queda solo el hash: quien lea la base o un respaldo no puede registrarse como
// ningún invitado. SHA-256 sin sal alcanza porque el token es aleatorio de 256 bits.
export const hashDelToken = (token: string): string => createHash('sha256').update(token).digest('hex')

// Lo mismo que le dice la pantalla de entrar a quien llega sin invitación. No distingue entre
// «no te invitaron», «tu invitación venció» y «ya la usaste»: las tres son la misma respuesta
// para quien está del otro lado, y separarlas convierte el registro en una forma de averiguar
// qué correos tienen invitación.
export const SIN_INVITACION =
  'Se entra por invitación. Si no tenés una, pedísela a quien lleva el libro.'
