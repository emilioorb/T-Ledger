import { Inject, Injectable } from '@nestjs/common'
import { SemanticValidationError } from '../../../shared/http/api-error.js'
import type { CurrencyCode } from '../../../shared/kernel/currency.js'
import { Money } from '../../../shared/kernel/money.js'
import { unwrap } from '../../../shared/kernel/result.js'
import { PeriodKey } from '../../accounting/domain/accounting-period.js'
import {
  BUDGET_INCOME_REPOSITORY,
  type BudgetIncomeRepository,
} from '../../budget/domain/budget-income-repository.port.js'
import { DEBT_REPOSITORY, type DebtRepository } from '../../debts/domain/debt-repository.port.js'
import { GOAL_REPOSITORY, type GoalRepository } from '../../goals/domain/goal-repository.port.js'
import {
  INVESTMENT_REPOSITORY,
  type InvestmentRepository,
} from '../../investments/domain/investment-repository.port.js'
import type { FreedInstallment, MonthlyFlow } from './monthly-flow.js'

const MAX_MONTHS = 120
const ALL = 1000

const firstDayOf = (year: number, month: number): Date => new Date(Date.UTC(year, month - 1, 1))

@Injectable()
export class CashFlowProjectionUseCase {
  constructor(
    @Inject(DEBT_REPOSITORY) private readonly debts: DebtRepository,
    @Inject(GOAL_REPOSITORY) private readonly goals: GoalRepository,
    @Inject(INVESTMENT_REPOSITORY) private readonly investments: InvestmentRepository,
    @Inject(BUDGET_INCOME_REPOSITORY) private readonly incomes: BudgetIncomeRepository,
  ) {}

  // Sin repositorio propio: orquesta los puertos de los otros módulos y devuelve un
  // resultado calculado. Si algún día necesita persistir, dejó de ser una proyección.
  async execute(months: number, from = new Date(), currency: CurrencyCode = 'CRC'): Promise<MonthlyFlow[]> {
    if (!Number.isInteger(months) || months <= 0) {
      throw new SemanticValidationError('La proyección necesita al menos un mes')
    }
    if (months > MAX_MONTHS) {
      throw new SemanticValidationError(`La proyección no pasa de ${MAX_MONTHS} meses`)
    }

    const [{ items: debts }, goals, investments] = await Promise.all([
      this.debts.findAll(1, ALL),
      this.goals.findAll(),
      this.investments.findAll(),
    ])

    const zero = Money.zero(currency)
    const flows: MonthlyFlow[] = []

    for (let offset = 0; offset < months; offset += 1) {
      const date = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + offset, 1))
      const year = date.getUTCFullYear()
      const month = date.getUTCMonth() + 1

      let debtPayments = zero
      let lentCollections = zero
      const freed: FreedInstallment[] = []

      for (const debt of debts) {
        const installment = debt.installmentDueIn(year, month)
        if (debt.direction === 'LENT') {
          lentCollections = unwrap(lentCollections.add(installment))
        } else {
          debtPayments = unwrap(debtPayments.add(installment))
        }

        // Se libera el mes siguiente al de la última cuota: es cuando el dinero queda
        // disponible de verdad.
        const payoff = debt.payoffDate()
        const freedYear = payoff.getUTCMonth() === 11 ? payoff.getUTCFullYear() + 1 : payoff.getUTCFullYear()
        const freedMonth = payoff.getUTCMonth() === 11 ? 1 : payoff.getUTCMonth() + 2
        if (debt.direction !== 'LENT' && freedYear === year && freedMonth === month) {
          freed.push({
            debtId: debt.id,
            name: debt.name,
            amount: debt.installmentDueIn(payoff.getUTCFullYear(), payoff.getUTCMonth() + 1),
          })
        }
      }

      const goalContributions = goals.reduce(
        (acc, goal) => unwrap(acc.add(goal.requiredMonthlyContribution(firstDayOf(year, month)))),
        zero,
      )

      const maturingInvestments = investments.reduce((acc, investment) => {
        const maturity = investment.maturityPeriod()
        if (!maturity || maturity.year !== year || maturity.month !== month) return acc
        return unwrap(acc.add(investment.valueAt(investment.maturesAt as Date)))
      }, zero)

      const declared = await this.incomes.find(unwrap(PeriodKey.of(year, month)))
      const estimatedSpending = zero

      const income = unwrap(
        unwrap((declared?.amount ?? zero).add(lentCollections)).add(maturingInvestments),
      )
      const committed = unwrap(
        unwrap(debtPayments.add(goalContributions)).add(estimatedSpending),
      )

      flows.push({
        year,
        month,
        income,
        committed,
        surplus: unwrap(income.subtract(committed)),
        debtPayments,
        lentCollections,
        goalContributions,
        maturingInvestments,
        estimatedSpending,
        freed,
      })
    }

    return flows
  }
}
