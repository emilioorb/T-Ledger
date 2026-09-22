import { fromMoney, type MoneyDto } from '../../../shared/http/money.schema.js'
import type { PeriodKey } from '../../accounting/domain/accounting-period.js'
import type { MonthEvaluation } from '../application/evaluate-month.use-case.js'
import type { MonthlyIncome } from '../domain/budget-income.js'
import type { BudgetModel } from '../domain/budget-model.js'
import type { BucketAccountCodes } from '../domain/budget-model-repository.port.js'

export const toEvaluationResponse = (period: PeriodKey, evaluation: MonthEvaluation) => ({
  modelId: evaluation.modelId,
  modelName: evaluation.modelName,
  period: period.toString(),
  income: fromMoney(evaluation.income),
  incomeDeclared: evaluation.incomeDeclared,
  totalConsumed: fromMoney(evaluation.totalConsumed),
  surplus: fromMoney(evaluation.surplus),
  buckets: evaluation.buckets.map((bucket) => ({
    bucketId: bucket.bucketId,
    name: bucket.name,
    allocated: fromMoney(bucket.allocated),
    consumed: fromMoney(bucket.consumed),
    deviation: fromMoney(bucket.deviation),
    status: bucket.status,
  })),
})

export const toModelResponse = (
  model: BudgetModel,
  active: boolean,
  mapping: readonly BucketAccountCodes[],
) => {
  const codesOf = new Map(mapping.map((entry) => [entry.bucketId, entry.accountCodes]))
  return {
    id: model.id,
    name: model.name,
    active,
    buckets: model.buckets.map((bucket) => ({
      id: bucket.id,
      name: bucket.name,
      percentage: bucket.percentage.value.toString(),
      isSavings: bucket.isSavings,
      accountCodes: [...(codesOf.get(bucket.id) ?? [])],
      colorIndex: bucket.colorIndex,
    })),
  }
}

export const toIncomeResponse = (income: MonthlyIncome): { period: string; amount: MoneyDto } => ({
  period: income.period.toString(),
  amount: fromMoney(income.amount),
})
