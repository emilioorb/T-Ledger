import type { Money } from '../../../shared/kernel/money.js'

export type BucketStatus = 'UNDER' | 'ON_TRACK' | 'OVER'

export interface BucketEvaluation {
  readonly bucketId: string
  readonly name: string
  readonly allocated: Money
  readonly consumed: Money
  // Positiva si sobró en la cubeta, negativa si se pasó.
  readonly deviation: Money
  readonly status: BucketStatus
}

export interface BudgetEvaluation {
  readonly income: Money
  readonly buckets: readonly BucketEvaluation[]
  readonly totalConsumed: Money
  readonly surplus: Money
}
