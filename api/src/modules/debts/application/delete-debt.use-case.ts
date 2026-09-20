import { Inject, Injectable } from '@nestjs/common'
import { NotFoundError } from '../../../shared/http/api-error.js'
import { DEBT_REPOSITORY, type DebtRepository } from '../domain/debt-repository.port.js'

@Injectable()
export class DeleteDebtUseCase {
  constructor(@Inject(DEBT_REPOSITORY) private readonly debts: DebtRepository) {}

  async execute(id: string): Promise<void> {
    const deleted = await this.debts.delete(id)
    if (!deleted) throw new NotFoundError(`No existe una deuda con el id ${id}`)
  }
}
