import type { BudgetModel } from './budget-model.js'

export interface BucketAccountCodes {
  readonly bucketId: string
  readonly accountCodes: readonly string[]
}

export interface BudgetModelRepository {
  findAll(): Promise<BudgetModel[]>
  findById(id: string): Promise<BudgetModel | null>
  findActive(): Promise<BudgetModel | null>
  save(model: BudgetModel, active: boolean, mapping: readonly BucketAccountCodes[]): Promise<void>

  // Qué cuentas alimentan cada cubeta vive fuera del modelo: el modelo dice cómo se
  // reparte el ingreso, y esto dice de dónde se lee el gasto. Cambiar el plan de cuentas
  // no debería obligar a redefinir los porcentajes.
  mappingFor(modelId: string): Promise<BucketAccountCodes[]>
}

export const BUDGET_MODEL_REPOSITORY = Symbol('BUDGET_MODEL_REPOSITORY')
