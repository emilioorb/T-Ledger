import { Inject, Injectable } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { NotFoundError } from '../../../shared/http/api-error.js'
import { exigirVersion } from '../../../shared/prisma/escribir-con-version.js'
import { UNIT_OF_WORK, type UnitOfWork } from '../../../shared/prisma/unit-of-work.port.js'
import { RASTRO, type Rastro } from '../../auditoria/domain/rastro.port.js'
import { MOVIMIENTO_ANULANDOSE, type MovimientoAnulandose } from '../accounting.events.js'
import { MOVEMENT_REPOSITORY, type MovementRepository } from '../domain/movement-repository.port.js'
import type { PostedMovement } from './create-movement.use-case.js'
import { MovementPoster } from './movement-poster.js'
import { PeriodGuard } from './period-guard.js'

@Injectable()
export class VoidMovementUseCase {
  constructor(
    @Inject(MOVEMENT_REPOSITORY) private readonly movements: MovementRepository,
    private readonly poster: MovementPoster,
    private readonly guard: PeriodGuard,
    @Inject(UNIT_OF_WORK) private readonly transaction: UnitOfWork,
    @Inject(RASTRO) private readonly rastro: Rastro,
    private readonly eventos: EventEmitter2,
  ) {}

  // Anular es marcar el movimiento y revertir sus asientos. A medias queda un movimiento
  // anulado con sus asientos vivos, que es la peor combinación: el mayor sigue contándolo. Y
  // todo va adentro del candado del libro: dos anulaciones a la vez dejaban dos reversiones.
  execute(id: string, version?: number): Promise<PostedMovement> {
    return this.transaction.withTransaction(() => this.anular(id, version))
  }

  private async anular(id: string, version: number | undefined): Promise<PostedMovement> {
    const movement = await this.movements.findById(id)
    if (!movement) throw new NotFoundError(`El movimiento ${id} no existe.`)
    await this.guard.assertOpen(movement.date)

    // Ya anulado es lo que se pedía, aunque la versión sea la de antes: la otra anulación ganó.
    if (movement.isVoided()) return { movement, journalEntryId: null }
    exigirVersion(version, movement.version, 'anular un movimiento')

    const voided = movement.void_()
    // Primero el aviso: si quien escucha frena la anulación, no se llegó a escribir nada.
    await this.eventos.emitAsync(MOVIMIENTO_ANULANDOSE, { movementId: id } satisfies MovimientoAnulandose)
    await this.movements.update(voided)
    // Sin `antes`/`despues`: anular no cambia campos, cambia el estado, y eso ya lo dice la
    // acción. Un diff acá mostraría «status: ACTIVE → VOIDED» y nada más.
    await this.rastro.registrar({ entidad: 'movimiento', entidadId: id, accion: 'anular' })
    await this.poster.reverse(id)

    return { movement: voided, journalEntryId: null }
  }
}
