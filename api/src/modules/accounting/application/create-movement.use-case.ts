import { randomUUID } from 'node:crypto'
import { Inject, Injectable } from '@nestjs/common'
import { SemanticValidationError } from '../../../shared/http/api-error.js'
import { toMoney } from '../../../shared/http/money.schema.js'
import { isErr } from '../../../shared/kernel/result.js'
import { UNIT_OF_WORK, type UnitOfWork } from '../../../shared/prisma/unit-of-work.port.js'
import { RASTRO, type Rastro } from '../../auditoria/domain/rastro.port.js'
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
    @Inject(UNIT_OF_WORK) private readonly transaction: UnitOfWork,
    @Inject(RASTRO) private readonly rastro: Rastro,
  ) {}

  // El mes abierto se lee dentro del candado del libro: leído afuera, un cierre que entraba en el
  // medio dejaba un asiento en un mes ya cerrado (ADR-006).
  execute(input: CreateMovementInput): Promise<PostedMovement> {
    return this.transaction.withTransaction(() => this.crear(input))
  }

  private async crear(input: CreateMovementInput): Promise<PostedMovement> {
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
      // Un movimiento nace sin comprobante: se adjunta después, con el archivo.
      receiptKey: null,
      status: 'ACTIVE',
      version: 0,
    })
    if (isErr(movement)) throw new SemanticValidationError(movement.error.message)

    // El movimiento y su asiento se guardan juntos o no se guarda ninguno: si el asiento
    // falla —cuenta de pago inexistente, por ejemplo— antes quedaba el movimiento sin
    // asentar, y eso bloquea el cierre del mes con un error que no explica nada.
    await this.movements.add(movement.value)
    // Dentro de la misma transacción que el cambio (ADR-004): no puede quedar un movimiento
    // sin su rastro ni un rastro de algo que al final no se guardó.
    await this.rastro.registrar({
      entidad: 'movimiento',
      entidadId: movement.value.id,
      accion: 'crear',
      despues: movement.value.toProps(),
    })
    const journalEntryId = await this.poster.post(movement.value, category)

    return { movement: movement.value, journalEntryId }
  }
}
