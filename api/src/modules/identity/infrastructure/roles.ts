import { createAccessControl } from 'better-auth/plugins/access'
import { defaultStatements } from 'better-auth/plugins/organization/access'

// Los roles que trae Better Auth —`owner`, `admin`, `member`, donde `member` es solo lectura—
// confunden con lo que hace falta acá: en una pareja los dos anotan. Se definen propios.
//
// `libro` reemplaza a `organization` en el vocabulario del dominio. En la interfaz esa palabra
// no aparece nunca, y los `defaultStatements` se conservan porque el plugin los usa por dentro
// para sus propios endpoints de miembros e invitaciones.
const statements = {
  ...defaultStatements,
  libro: ['update', 'delete', 'vaciar'],
  movimiento: ['create', 'read', 'update', 'delete'],
  periodo: ['read', 'close', 'reopen'],
  presupuesto: ['read', 'write'],
  deuda: ['read', 'write'],
  meta: ['read', 'write'],
  inversion: ['read', 'write'],
} as const

export const ac = createAccessControl(statements)

// Solo lee. Existe para el caso familiar: alguien ve el libro de la casa sin poder anotar.
export const viewer = ac.newRole({
  movimiento: ['read'],
  periodo: ['read'],
  presupuesto: ['read'],
  deuda: ['read'],
  meta: ['read'],
  inversion: ['read'],
})

// Toda la contabilidad y nada de la gente. Es el reparto de una pareja real, donde los dos
// manejan la plata pero uno solo decide quién entra al libro.
export const editor = ac.newRole({
  movimiento: ['create', 'read', 'update', 'delete'],
  periodo: ['read', 'close', 'reopen'],
  presupuesto: ['read', 'write'],
  deuda: ['read', 'write'],
  meta: ['read', 'write'],
  inversion: ['read', 'write'],
})

// Lo del editor más la gente y el libro mismo.
export const owner = ac.newRole({
  ...editor.statements,
  libro: ['update', 'delete', 'vaciar'],
  member: ['create', 'update', 'delete'],
  invitation: ['create', 'cancel'],
})

export const roles = { owner, editor, viewer }
