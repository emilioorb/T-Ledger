import { Inject, Injectable } from '@nestjs/common'
import { NotFoundError } from '../../../shared/http/api-error.js'
import type { Debt } from '../domain/debt.js'
import { DEBT_REPOSITORY, type DebtRepository } from '../domain/debt-repository.port.js'

@Injectable()
export class GetDebtUseCase {
  constructor(@Inject(DEBT_REPOSITORY) private readonly debts: DebtRepository) {}

  async execute(id: string): Promise<Debt> {
    const debt = await this.debts.findById(id)
    if (!debt) throw new NotFoundError(`No existe una deuda con el id ${id}`)
    return debt
  }
}
