import { Inject, Injectable } from '@nestjs/common'
import { ConflictError, NotFoundError } from '../../../shared/http/api-error.js'
import {
  BANK_STATEMENT_REPOSITORY,
  type BankStatementRepository,
} from '../domain/bank-statement-repository.port.js'

@Injectable()
export class MatchLineUseCase {
  constructor(
    @Inject(BANK_STATEMENT_REPOSITORY) private readonly statements: BankStatementRepository,
  ) {}

  async match(lineId: string, movementId: string): Promise<void> {
    const line = await this.find(lineId)
    if (line.status === 'MATCHED') {
      throw new ConflictError('Esa línea ya está conciliada. Deshacela antes de cambiarla.')
    }

    // Un movimiento explica una sola línea del banco: permitir dos sería contar el mismo
    // gasto dos veces y dejar la diferencia cuadrando por casualidad.
    if (await this.statements.isMovementTaken(movementId, lineId)) {
      throw new ConflictError('Ese movimiento ya está conciliado con otra línea.')
    }

    await this.statements.markMatched(lineId, movementId)
  }

  async unmatch(lineId: string): Promise<void> {
    await this.find(lineId)
    await this.statements.markPending(lineId)
  }

  async ignore(lineId: string): Promise<void> {
    const line = await this.find(lineId)
    if (line.status === 'MATCHED') {
      throw new ConflictError('Esa línea está conciliada: deshacela antes de ignorarla.')
    }
    await this.statements.markIgnored(lineId)
  }

  private async find(lineId: string) {
    const line = await this.statements.findLine(lineId)
    if (!line) throw new NotFoundError(`La línea ${lineId} no existe.`)
    return line
  }
}
