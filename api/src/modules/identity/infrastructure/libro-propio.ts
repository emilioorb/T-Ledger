import type { PrismaClient } from '../../../generated/prisma/client.js'
import { ESPACIO_DE_PERSONAS, ESPERA_MAXIMA_DEL_CANDADO } from '../../../shared/prisma/candados.js'

// Lo único que hace falta de Better Auth para abrir un libro: su API de organizaciones, que es la
// que corre `afterCreateOrganization` y deja el libro con su plan de cuentas.
export interface AbreLibros {
  api: {
    createOrganization(pedido: { body: { name: string; slug: string; userId: string } }): Promise<unknown>
  }
}

// La creación y la siembra del plan corren por otras conexiones mientras esta retiene el candado.
const DURACION_MAXIMA_MS = 15_000

// Toda cuenta tiene al menos un libro: sin ninguno, cada ruta contesta 403 y la persona queda
// adentro sin poder hacer nada, ni siquiera crear otro. Quien se queda sin libros —borraron uno
// compartido, lo sacaron o se fue del único que tenía— recibe uno propio, vacío, como al
// registrarse, y sus sesiones pasan a estar paradas en él.
//
// Con el candado de la persona y contando adentro: dos pérdidas a la vez abren un solo libro.
// Devuelve el libro que abrió, o `null` si no hizo falta.
export const asegurarLibroPropio = (auth: AbreLibros, prisma: PrismaClient, userId: string): Promise<string | null> =>
  prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT set_config('lock_timeout', ${ESPERA_MAXIMA_DEL_CANDADO}, true)`
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${ESPACIO_DE_PERSONAS}::int, hashtext(${userId}))`
      if ((await prisma.bookMember.count({ where: { userId } })) > 0) return null
      // Quien se está dando de baja no necesita libro.
      if (!(await prisma.authUser.findUnique({ where: { id: userId }, select: { id: true } }))) return null

      // El slug es único en toda la instancia y el del registro puede seguir tomado: lleva la hora.
      await auth.api.createOrganization({
        body: { name: 'Personal', slug: `personal-${userId}-${Date.now().toString(36)}`, userId },
      })
      const nuevo = await prisma.bookMember.findFirstOrThrow({ where: { userId }, select: { organizationId: true } })
      // Una sesión parada en el libro que perdió contesta 403 a todo: pasa al nuevo.
      await prisma.authSession.updateMany({ where: { userId }, data: { activeOrganizationId: nuevo.organizationId } })
      return nuevo.organizationId
    },
    { timeout: DURACION_MAXIMA_MS },
  )
