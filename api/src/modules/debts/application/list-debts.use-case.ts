import { Inject, Injectable } from '@nestjs/common'
import type { Debt } from '../domain/debt.js'
import type { DebtDirection } from '../domain/debt.js'
import { DEBT_REPOSITORY, type DebtRepository } from '../domain/debt-repository.port.js'

@Injectable()
export class ListDebtsUseCase {
  constructor(@Inject(DEBT_REPOSITORY) private readonly debts: DebtRepository) {}

  async execute(
    page: number,
    pageSize: number,
    direction?: DebtDirection,
  ): Promise<{ items: Debt[]; totalItems: number }> {
    return this.debts.findAll(page, pageSize, direction)
  }
}
