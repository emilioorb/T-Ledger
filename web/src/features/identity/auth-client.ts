import { organizationClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'
import { controlDeAcceso, rolesDelLibro } from './roles'

// El único archivo del front que habla con Better Auth. Sus rutas quedan fuera del contrato
// Zod → OpenAPI del resto de la API (ADR-001), así que acá no hay tipos generados: los pone
// su propio cliente. Tenerlo en un solo lugar es lo que evita que esa excepción se desparrame.
//
// `baseURL` es el origen del servidor y **no** lleva `/api/auth`: el `basePath` ya vale eso por
// defecto, y un path dentro del `baseURL` lo reemplaza en vez de sumarse. Ponerlo acá
// duplicaría el segmento.
//
// Por defecto apunta al **mismo origen**, no a `localhost:3000`: el proxy de Vite ya reenvía
// todo `/api` al backend (`vite.config.ts`), así que la sesión viaja sin cruzar de origen y
// sin pedirle permiso a CORS para mandar la cookie. `VITE_API_URL` queda para el día que el
// front y la API vivan en dominios distintos.
//
// Se importa de `better-auth/react` y no de `better-auth/client` porque esta es la app de
// React: la variante de React es la que trae los hooks reactivos de sesión.
export const auth = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL ?? window.location.origin,
  plugins: [organizationClient({ ac: controlDeAcceso, roles: rolesDelLibro })],
})

export const {
  useSession,
  signIn,
  signUp,
  signOut,
  useActiveOrganization,
  useListOrganizations,
  organization,
} = auth
