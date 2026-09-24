import type { BudgetModel } from './budget-model.js'

export interface BucketAccountCodes {
  readonly bucketId: string
  readonly accountCodes: readonly string[]
}

export interface BudgetModelRepository {
  findAll(): Promise<BudgetModel[]>
  findById(id: string): Promise<BudgetModel | null>
  findActive(): Promise<BudgetModel | null>
  // Activar uno apaga los demás, y les sube la versión: quien editaba uno de esos no lo vuelve a
  // prender sin enterarse.
  add(model: BudgetModel, active: boolean, mapping: readonly BucketAccountCodes[]): Promise<void>
  // Solo si la fila sigue en la versión del modelo: si no, `EditadoPorOtroError`, o `NotFoundError`.
  // Las cubetas se diferencian por su clave, no se borran y recrean. Devuelve el modelo guardado.
  update(model: BudgetModel, active: boolean, mapping: readonly BucketAccountCodes[]): Promise<BudgetModel>

  // Qué cuentas alimentan cada cubeta vive fuera del modelo: el modelo dice cómo se
  // reparte el ingreso, y esto dice de dónde se lee el gasto. Cambiar el plan de cuentas
  // no debería obligar a redefinir los porcentajes.
  mappingFor(modelId: string): Promise<BucketAccountCodes[]>
}

export const BUDGET_MODEL_REPOSITORY = Symbol('BUDGET_MODEL_REPOSITORY')
