import { conLibro } from '../../../shared/libro/libro-context.js'
import type { UnitOfWork } from '../../../shared/prisma/unit-of-work.port.js'
import type { Rastro } from '../../auditoria/domain/rastro.port.js'
import type { CambioDeMiembro } from './auth.config.js'

// El libro y el autor vienen del gancho, no del contexto de la petición. Dentro de los
// manejadores de Better Auth ese contexto no llega —probado: el rastro salió firmado por la
// persona equivocada—, y el gancho sí sabe quién invitó, quién canceló y quién aceptó. La
// entrada del rastro es una escritura del libro, así que va con su candado (ADR-006).
export const rastroDeMiembros =
  (transaccion: UnitOfWork, rastro: Rastro) =>
  async ({ bookId, aQuien, autorId, accion, antes, despues }: CambioDeMiembro): Promise<void> => {
    await conLibro({ bookId, userId: autorId, rol: 'owner' }, () =>
      transaccion.withTransaction(() =>
        rastro.registrar({
          entidad: 'miembro',
          entidadId: aQuien,
          accion,
          ...(antes ? { antes } : {}),
          ...(despues ? { despues } : {}),
        }),
      ),
    )
  }
