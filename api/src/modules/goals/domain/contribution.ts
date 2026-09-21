import type { Money } from '../../../shared/kernel/money.js'

export interface Contribution {
  readonly id: string
  readonly date: Date
  readonly amount: Money
}
