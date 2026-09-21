import { randomUUID } from 'node:crypto'
import { Inject, Injectable } from '@nestjs/common'
import { SemanticValidationError } from '../../../shared/http/api-error.js'
import { toMoney } from '../../../shared/http/money.schema.js'
import { isErr } from '../../../shared/kernel/result.js'
import { MOVEMENT_REPOSITORY, type MovementRepository } from '../domain/movement-repository.port.js'
import { Movement } from '../domain/movement.js'
import type { CreateMovementInput } from '../infrastructure/accounting.schemas.js'
import { ManageCategoriesUseCase } from './manage-categories.use-case.js'
import { MovementPoster } from './movement-poster.js'
import { PeriodGuard } from './period-guard.js'

export interface PostedMovement {
  readonly movement: Movement
  readonly journalEntryId: string | null
}

@Injectable()
export class CreateMovementUseCase {
  constructor(
    @Inject(MOVEMENT_REPOSITORY) private readonly movements: MovementRepository,
    private readonly categories: ManageCategoriesUseCase,
    private readonly poster: MovementPoster,
    private readonly guard: PeriodGuard,
  ) {}

  async execute(input: CreateMovementInput): Promise<PostedMovement> {
    const date = new Date(`${input.date}T00:00:00.000Z`)
    await this.guard.assertOpen(date)

    const category = await this.categories.find(input.categoryId)
    const movement = Movement.create({
      id: randomUUID(),
      date,
      kind: input.kind,
      categoryId: input.categoryId,
      counterparty: input.counterparty,
      amount: toMoney(input.amount),
      paymentAccountCode: input.paymentAccountCode,
      receiptUrl: input.receiptUrl,
      status: 'ACTIVE',
    })
    if (isErr(movement)) throw new SemanticValidationError(movement.error.message)

    await this.movements.save(movement.value)
    const journalEntryId = await this.poster.post(movement.value, category)

    return { movement: movement.value, journalEntryId }
  }
}
