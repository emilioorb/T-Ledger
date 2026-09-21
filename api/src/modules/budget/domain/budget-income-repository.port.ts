import type { PeriodKey } from '../../accounting/domain/accounting-period.js'
import type { MonthlyIncome } from './budget-income.js'

export interface BudgetIncomeRepository {
  find(period: PeriodKey): Promise<MonthlyIncome | null>
  save(income: MonthlyIncome): Promise<void>
}

export const BUDGET_INCOME_REPOSITORY = Symbol('BUDGET_INCOME_REPOSITORY')
