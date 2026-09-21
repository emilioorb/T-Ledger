import type { components } from '@/lib/api-types.gen'

export type Money = components['schemas']['Money']

export interface FreedInstallment {
  debtId: string
  name: string
  amount: Money
}

export interface MonthlyFlow {
  year: number
  month: number
  income: Money
  committed: Money
  surplus: Money
  debtPayments: Money
  lentCollections: Money
  goalContributions: Money
  maturingInvestments: Money
  estimatedSpending: Money
  incomeDeclared: boolean
  freed: FreedInstallment[]
}
