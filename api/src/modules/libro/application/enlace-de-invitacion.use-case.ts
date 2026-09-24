import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { libroActual } from '../../../shared/libro/libro-context.js'
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
  ) {}

  async renovar(invitationId: string): Promise<string> {
    const { bookId } = libroActual('sacar el enlace de una invitación')
    const token = await this.enlaces.paraUnLibro(invitationId, bookId)
    if (!token) throw new NotFoundException('Esa invitación no existe o ya no está pendiente.')
    await this.rastro.registrar({
      entidad: 'miembro',
      entidadId: invitationId,
      accion: 'editar',
      despues: { enlaceNuevo: true },
    })
    return token
  }
}
