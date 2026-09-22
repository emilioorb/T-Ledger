import type { Rol } from '../../../shared/libro/libro-context.js'
import { roles } from './roles.js'

export type Recurso =
  | 'movimiento'
  | 'periodo'
  | 'presupuesto'
  | 'deuda'
  | 'meta'
  | 'inversion'
  | 'cuenta'
  | 'categoria'
  | 'asiento'
  | 'banco'
  | 'libro'
  | 'member'
  | 'invitation'
  | 'auditoria'

// La segunda capa del aislamiento. La extensión de Prisma sabe **de qué libro** es cada fila;
// no sabe si quien pide puede escribirla. Alguien con rol de solo mirar, correctamente
// filtrado a su libro, editaría un movimiento si nadie chequeara el rol.
//
// Se apoya en los mismos roles que usa Better Auth para sus propios endpoints de miembros e
// invitaciones, así que no hay dos definiciones de quién puede qué esperando a divergir.
export const puede = (rol: Rol, recurso: Recurso, accion: string): boolean =>
  roles[rol].authorize({ [recurso]: [accion] } as never).success
