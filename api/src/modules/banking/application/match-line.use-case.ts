import { Inject, Injectable } from '@nestjs/common'
import {
  ConflictError,
  NotFoundError,
  SemanticValidationError,
} from '../../../shared/http/api-error.js'
import type { Money } from '../../../shared/kernel/money.js'
import { UNIT_OF_WORK, type UnitOfWork } from '../../../shared/prisma/unit-of-work.port.js'
import {
  MOVEMENT_REPOSITORY,
  type MovementRepository,
} from '../../accounting/domain/movement-repository.port.js'
import {
  BANK_STATEMENT_REPOSITORY,
  type BankStatementRepository,
} from '../domain/bank-statement-repository.port.js'
import { ManageBankAccountsUseCase } from './manage-bank-accounts.use-case.js'

// Un movimiento es siempre positivo: el signo del extracto define la dirección, no el monto.
const magnitudeOf = (amount: Money): Money => (amount.isNegative() ? amount.negate() : amount)

@Injectable()
export class MatchLineUseCase {
  constructor(
    @Inject(BANK_STATEMENT_REPOSITORY) private readonly statements: BankStatementRepository,
    @Inject(MOVEMENT_REPOSITORY) private readonly movements: MovementRepository,
    private readonly accounts: ManageBankAccountsUseCase,
    @Inject(UNIT_OF_WORK) private readonly transaction: UnitOfWork,
  ) {}

  // Cada paso va en transacción, con el candado del libro tomado: el estado de la línea y si el
  // movimiento ya está tomado se leen adentro, así dos personas conciliando a la vez no pasan
  // las dos el control (ADR-006). El índice único de la base es la segunda red.
  async match(lineId: string, movementId: string): Promise<void> {
    await this.transaction.withTransaction(() => this.conciliar(lineId, movementId))
  }

  async unmatch(lineId: string): Promise<void> {
    await this.transaction.withTransaction(async () => {
      await this.find(lineId)
      await this.statements.markPending(lineId)
    })
  }

  async ignore(lineId: string): Promise<void> {
    await this.transaction.withTransaction(async () => {
      const line = await this.find(lineId)
      if (line.status === 'MATCHED') {
        throw new ConflictError('Esa línea está conciliada: deshacela antes de ignorarla.')
      }
      await this.statements.markIgnored(lineId)
    })
  }

  private async conciliar(lineId: string, movementId: string): Promise<void> {
    const line = await this.find(lineId)
    if (line.status === 'MATCHED') {
      throw new ConflictError('Esa línea ya está conciliada. Deshacela antes de cambiarla.')
    }

    // Un movimiento explica una sola línea del banco: permitir dos sería contar el mismo
    // gasto dos veces y dejar la diferencia cuadrando por casualidad.
    if (await this.statements.isMovementTaken(movementId, lineId)) {
      throw new ConflictError('Ese movimiento ya está conciliado con otra línea.')
    }

    // Conciliar contra un movimiento que no existe, que está anulado, que es de otra cuenta o
    // que es por otro monto saca la línea del pendiente y deja la diferencia cuadrando contra
    // nada. Es el único punto donde el usuario elige el par a mano, así que el par se verifica.
    const movement = await this.movements.findById(movementId)
    if (!movement) throw new NotFoundError(`El movimiento ${movementId} no existe.`)
    if (movement.isVoided()) {
      throw new SemanticValidationError('Ese movimiento está anulado: no explica ninguna línea.')
    }

    const account = await this.accounts.find(line.bankAccountId)
    if (movement.paymentAccountCode !== account.accountCode) {
      throw new SemanticValidationError(
        `Ese movimiento se pagó con la cuenta ${movement.paymentAccountCode ?? 'sin asignar'} y la línea es de la ${account.accountCode}.`,
      )
    }

    const expected = magnitudeOf(line.amount)
    if (!movement.amount.equals(expected)) {
      throw new SemanticValidationError(
        `El movimiento es por ${movement.amount.toDecimal().toFixed(2)} y la línea por ${expected.toDecimal().toFixed(2)}.`,
      )
    }

    await this.statements.markMatched(lineId, movementId)
  }

  private async find(lineId: string) {
    const line = await this.statements.findLine(lineId)
    if (!line) throw new NotFoundError(`La línea ${lineId} no existe.`)
    return line
  }
}
