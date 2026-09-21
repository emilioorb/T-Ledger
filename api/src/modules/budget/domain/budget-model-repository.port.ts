import type { BudgetModel } from './budget-model.js'

export interface BudgetModelRepository {
  findAll(): Promise<BudgetModel[]>
  findById(id: string): Promise<BudgetModel | null>
  findActive(): Promise<BudgetModel | null>
  save(model: BudgetModel, active: boolean): Promise<void>
}

export const BUDGET_MODEL_REPOSITORY = Symbol('BUDGET_MODEL_REPOSITORY')
