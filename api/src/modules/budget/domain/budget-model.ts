import type { Money } from '../../../shared/kernel/money.js'
import type { BudgetBucket } from './budget-bucket.js'
import type { BudgetEvaluation } from './budget-evaluation.js'
import type { CategorizedSpending } from './categorized-spending.js'

export interface BudgetModel {
  readonly id: string
  readonly name: string
  readonly buckets: readonly BudgetBucket[]
  evaluate(income: Money, spending: CategorizedSpending): BudgetEvaluation
}
