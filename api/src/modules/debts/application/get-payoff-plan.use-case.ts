import { Inject, Injectable } from '@nestjs/common'
import type { Debt } from '../domain/debt.js'
import { DEBT_REPOSITORY, type DebtRepository } from '../domain/debt-repository.port.js'
import { payoffStrategyFor, type PayoffStrategyId } from '../domain/payoff-strategy.js'

const ALL = 1000

@Injectable()
export class GetPayoffPlanUseCase {
  constructor(@Inject(DEBT_REPOSITORY) private readonly debts: DebtRepository) {}

  async execute(strategy: PayoffStrategyId, orderedIds: readonly string[], at = new Date()): Promise<Debt[]> {
    const { items } = await this.debts.findAll(1, ALL, 'BORROWED')
    return payoffStrategyFor(strategy, orderedIds).order(items, at)
  }
}
