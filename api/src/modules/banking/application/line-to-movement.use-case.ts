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

  async execute(lineId: string, input: LineToMovementInput): Promise<{ movementId: string }> {
    const line = await this.statements.findLine(lineId)
    if (!line) throw new NotFoundError(`La línea ${lineId} no existe.`)
    if (line.status !== 'PENDING') {
      throw new ConflictError('Esa línea ya está conciliada o ignorada.')
    }

    const account = await this.accounts.find(line.bankAccountId)

    // Un movimiento siempre es positivo: el signo del extracto define la dirección, no el monto.
    const magnitude = line.amount.isNegative() ? line.amount.negate() : line.amount

    // Crear el movimiento y marcar la línea van juntos: si falla lo segundo la línea queda
    // pendiente con su movimiento ya creado, y volver a conciliarla —que es lo que el usuario
    // hace— duplica el movimiento y el asiento.
    return this.transaction.withTransaction(async () => {
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
    })
  }
}
