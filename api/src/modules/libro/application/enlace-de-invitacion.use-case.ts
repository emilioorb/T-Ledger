import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { libroActual } from '../../../shared/libro/libro-context.js'
import { UNIT_OF_WORK, type UnitOfWork } from '../../../shared/prisma/unit-of-work.port.js'
import { RASTRO, type Rastro } from '../../auditoria/domain/rastro.port.js'
import { EnlacesDeInvitacion } from '../../identity/infrastructure/enlaces-de-invitacion.js'

// El enlace para mandarle a quien se invitó al libro: registrarse y aceptar exigen tenerlo.
// Cada pedido da uno nuevo y el que ya se había mandado deja de servir, así que queda anotado
// quién lo renovó (sin el token): en un libro con dos dueños, uno puede invalidar el enlace que
// mandó el otro.
@Injectable()
export class EnlaceDeInvitacionUseCase {
  constructor(
    private readonly enlaces: EnlacesDeInvitacion,
    @Inject(RASTRO) private readonly rastro: Rastro,
    @Inject(UNIT_OF_WORK) private readonly transaction: UnitOfWork,
  ) {}

  // El enlace se guarda por su lado, sin el filtro de libro, así que no entra en la transacción
  // del rastro. Va último: si falla, el rastro se deshace con la transacción y el enlace viejo
  // sigue sirviendo; al revés, un rastro que no se pudo guardar dejaría un enlace cambiado sin
  // que conste quién lo cambió.
  async renovar(invitationId: string): Promise<string> {
    const { bookId } = libroActual('sacar el enlace de una invitación')
    return this.transaction.withTransaction(async () => {
      await this.rastro.registrar({
        entidad: 'miembro',
        entidadId: invitationId,
        accion: 'editar',
        despues: { enlaceNuevo: true },
      })
      const token = await this.enlaces.paraUnLibro(invitationId, bookId)
      if (!token) throw new NotFoundException('Esa invitación no existe o ya no está pendiente.')
      return token
    })
  }
}
