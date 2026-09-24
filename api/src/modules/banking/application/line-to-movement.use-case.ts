import { Inject, Injectable } from '@nestjs/common'
import { ConflictError, NotFoundError } from '../../../shared/http/api-error.js'
import { UNIT_OF_WORK, type UnitOfWork } from '../../../shared/prisma/unit-of-work.port.js'
import { CreateMovementUseCase } from '../../accounting/application/create-movement.use-case.js'
import {
  BANK_STATEMENT_REPOSITORY,
  type BankStatementRepository,
} from '../domain/bank-statement-repository.port.js'
import { ManageBankAccountsUseCase } from './manage-bank-accounts.use-case.js'

export interface LineToMovementInput {
  readonly categoryId: string
  readonly counterparty?: string | undefined
}

@Injectable()
export class LineToMovementUseCase {
  constructor(
    @Inject(BANK_STATEMENT_REPOSITORY) private readonly statements: BankStatementRepository,
    private readonly accounts: ManageBankAccountsUseCase,
    // El módulo no escribe asientos: entra por la misma puerta que la carga manual, y así
    // hereda el guardián de período sin conocerlo.
    private readonly createMovement: CreateMovementUseCase,
    @Inject(UNIT_OF_WORK) private readonly transaction: UnitOfWork,
  ) {}

  // Todo adentro del candado del libro: la línea se mira ahí, así dos «convertir» a la vez no
  // generan dos movimientos (ADR-006). Crear el movimiento y marcar la línea van juntos: si falla
  // lo segundo, volver a convertirla duplicaría el movimiento y el asiento.
  execute(lineId: string, input: LineToMovementInput): Promise<{ movementId: string }> {
    return this.transaction.withTransaction(() => this.convertir(lineId, input))
  }

  private async convertir(lineId: string, input: LineToMovementInput): Promise<{ movementId: string }> {
    const line = await this.statements.findLine(lineId)
    if (!line) throw new NotFoundError(`La línea ${lineId} no existe.`)
    if (line.status !== 'PENDING') {
      throw new ConflictError('Esa línea ya está conciliada o ignorada.')
    }

    const account = await this.accounts.find(line.bankAccountId)

    // Un movimiento siempre es positivo: el signo del extracto define la dirección, no el monto.
    const magnitude = line.amount.isNegative() ? line.amount.negate() : line.amount

    const { movement } = await this.createMovement.execute({
      date: line.date.toISOString().slice(0, 10),
      kind: line.amount.isNegative() ? 'EXPENSE' : 'INCOME',
      categoryId: input.categoryId,
      counterparty: input.counterparty ?? line.description,
      amount: { minorUnits: magnitude.minorUnits.toString(), currency: magnitude.currency },
      paymentAccountCode: account.accountCode,
    })

    await this.statements.markMatched(lineId, movement.id)
    return { movementId: movement.id }
  }
}
