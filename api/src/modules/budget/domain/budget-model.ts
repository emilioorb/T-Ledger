import type { Money } from '../../../shared/kernel/money.js'
import type { BudgetBucket } from './budget-bucket.js'
import type { BudgetEvaluation } from './budget-evaluation.js'
import type { CategorizedSpending } from './categorized-spending.js'

export interface BudgetModel {
  readonly id: string
  readonly name: string
  readonly buckets: readonly BudgetBucket[]
  // La versión de la fila sobre la que se armó (6b): guardar exige que siga en ella.
  readonly version: number
  evaluate(income: Money, spending: CategorizedSpending): BudgetEvaluation
  // Lo que queda después de guardarse: la base sube la versión en cada escritura.
  guardado(): BudgetModel
}
