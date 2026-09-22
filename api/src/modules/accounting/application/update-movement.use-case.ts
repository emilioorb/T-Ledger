import { Inject, Injectable } from '@nestjs/common'
import {
  ConflictError,
  NotFoundError,
  SemanticValidationError,
} from '../../../shared/http/api-error.js'
import { toMoney } from '../../../shared/http/money.schema.js'
import { isErr } from '../../../shared/kernel/result.js'
import { UNIT_OF_WORK, type UnitOfWork } from '../../../shared/prisma/unit-of-work.port.js'
import { RASTRO, type Rastro } from '../../auditoria/domain/rastro.port.js'
import { MOVEMENT_REPOSITORY, type MovementRepository } from '../domain/movement-repository.port.js'
import { Movement } from '../domain/movement.js'
import type { UpdateMovementInput } from '../infrastructure/accounting.schemas.js'
import type { PostedMovement } from './create-movement.use-case.js'
import { ManageCategoriesUseCase } from './manage-categories.use-case.js'
import { MovementPoster } from './movement-poster.js'
import { PeriodGuard } from './period-guard.js'

@Injectable()
export class UpdateMovementUseCase {
  constructor(
    @Inject(MOVEMENT_REPOSITORY) private readonly movements: MovementRepository,
    private readonly categories: ManageCategoriesUseCase,
    private readonly poster: MovementPoster,
    private readonly guard: PeriodGuard,
    @Inject(UNIT_OF_WORK) private readonly transaction: UnitOfWork,
    @Inject(RASTRO) private readonly rastro: Rastro,
  ) {}

  // Editar no reescribe el asiento: revierte el vigente y emite uno nuevo, así el mayor
  // conserva lo que se registró y lo que se corrigió.
  async execute(id: string, input: UpdateMovementInput): Promise<PostedMovement> {
    const current = await this.movements.findById(id)
    if (!current) throw new NotFoundError(`El movimiento ${id} no existe.`)
    if (current.isVoided()) {
      throw new ConflictError('Un movimiento anulado no se edita: registrá uno nuevo.')
    }

    const props = current.toProps()
    const date = input.date ? new Date(`${input.date}T00:00:00.000Z`) : props.date
    await this.guard.assertOpen(props.date)
    await this.guard.assertOpen(date)

    const movement = Movement.create({
      ...props,
      date,
      kind: input.kind ?? props.kind,
      categoryId: input.categoryId ?? props.categoryId,
      counterparty: input.counterparty ?? props.counterparty,
      amount: input.amount ? toMoney(input.amount) : props.amount,
      paymentAccountCode: input.paymentAccountCode ?? props.paymentAccountCode,
      receiptUrl: input.receiptUrl ?? props.receiptUrl,
    })
    if (isErr(movement)) throw new SemanticValidationError(movement.error.message)

    const category = await this.categories.find(movement.value.categoryId)

    const journalEntryId = await this.transaction.withTransaction(async () => {
      await this.poster.reverse(id)
      await this.movements.save(movement.value)
      await this.rastro.registrar({
        entidad: 'movimiento',
        entidadId: id,
        accion: 'editar',
        antes: props,
        despues: movement.value.toProps(),
      })
      return this.poster.post(movement.value, category)
    })

    return { movement: movement.value, journalEntryId }
  }
}
