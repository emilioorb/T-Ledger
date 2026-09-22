import { createAccessControl } from 'better-auth/plugins/access'
import { defaultStatements } from 'better-auth/plugins/organization/access'

// Los nombres de los roles del libro, para que el cliente de Better Auth los conozca.
//
// Quién puede hacer qué lo decide y lo hace cumplir la API (`api/src/modules/identity/
// infrastructure/roles.ts`), que es la única autoridad: el front no chequea permisos en
// ningún lado. Acá hacen falta los nombres porque sin ellos `inviteMember` y
// `updateMemberRole` solo aceptan los tres roles de fábrica —`owner`, `admin`, `member`— y
// los nuestros son otros.
//
// Por eso los cuerpos van vacíos: repetir los permisos sería poner una segunda copia de la
// regla que nadie lee y que se desincroniza sin que nada falle. Si algún día el front
// necesita decidir algo con `checkRolePermission`, esto deja de alcanzar y los permisos
// tienen que compartirse de verdad entre los dos proyectos.
const ac = createAccessControl(defaultStatements)

export const rolesDelLibro = {
  owner: ac.newRole({}),
  editor: ac.newRole({}),
  viewer: ac.newRole({}),
}

export const controlDeAcceso = ac
