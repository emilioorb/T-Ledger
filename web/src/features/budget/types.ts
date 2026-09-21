import type { components } from '@/lib/api-types.gen'

export type Money = components['schemas']['Money']
export type BudgetEvaluation = components['schemas']['BudgetEvaluation']
export type BudgetModel = components['schemas']['BudgetModelResponse']
export type BudgetModelInput = components['schemas']['BudgetModelInput']
export type MonthlyIncome = components['schemas']['MonthlyIncome']
export type CurrencyCode = Money['currency']

export type BucketEvaluation = BudgetEvaluation['buckets'][number]
export type BucketStatus = BucketEvaluation['status']
