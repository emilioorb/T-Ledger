import { Inject, Injectable } from '@nestjs/common'
import { NotFoundError } from '../../../shared/http/api-error.js'
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
  ) {}

  async execute(id: string): Promise<PostedMovement> {
    const movement = await this.movements.findById(id)
    if (!movement) throw new NotFoundError(`El movimiento ${id} no existe.`)
    await this.guard.assertOpen(movement.date)

    if (movement.isVoided()) return { movement, journalEntryId: null }

    const voided = movement.void_()
    await this.movements.save(voided)
    await this.poster.reverse(id)

    return { movement: voided, journalEntryId: null }
  }
}
