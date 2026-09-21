import { randomUUID } from 'node:crypto'
import { Inject, Injectable } from '@nestjs/common'
import { Decimal } from 'decimal.js'
import { NotFoundError, SemanticValidationError } from '../../../shared/http/api-error.js'
import { Percentage } from '../../../shared/kernel/percentage.js'
import { isErr } from '../../../shared/kernel/result.js'
import type { BudgetModel } from '../domain/budget-model.js'
import {
  BUDGET_MODEL_REPOSITORY,
  type BucketAccountCodes,
  type BudgetModelRepository,
} from '../domain/budget-model-repository.port.js'
import { PercentageBudgetModel } from '../domain/percentage-budget-model.js'
import type { BudgetModelInput } from '../infrastructure/budget.schemas.js'

export interface StoredBudgetModel {
  readonly model: BudgetModel
  readonly active: boolean
  readonly mapping: BucketAccountCodes[]
}

@Injectable()
export class ManageBudgetModelsUseCase {
  constructor(@Inject(BUDGET_MODEL_REPOSITORY) private readonly models: BudgetModelRepository) {}

  async list(): Promise<{ models: BudgetModel[]; activeId: string | null }> {
    const [models, active] = await Promise.all([this.models.findAll(), this.models.findActive()])
    return { models, activeId: active?.id ?? null }
  }

  async find(id: string): Promise<BudgetModel> {
    const model = await this.models.findById(id)
    if (!model) throw new NotFoundError(`El modelo de presupuesto ${id} no existe.`)
    return model
  }

  async create(input: BudgetModelInput): Promise<BudgetModel> {
    return this.save(randomUUID(), input)
  }

  async update(id: string, input: BudgetModelInput): Promise<BudgetModel> {
    await this.find(id)
    return this.save(id, input)
  }

  async mappingFor(id: string): Promise<BucketAccountCodes[]> {
    return this.models.mappingFor(id)
  }

  private async save(id: string, input: BudgetModelInput): Promise<BudgetModel> {
    const buckets = input.buckets.map((bucket) => {
      const percentage = Percentage.create(new Decimal(bucket.percentage))
      if (isErr(percentage)) throw new SemanticValidationError(percentage.error.message)
      return {
        id: bucket.id,
        name: bucket.name,
        percentage: percentage.value,
        isSavings: bucket.isSavings,
      }
    })

    const model = PercentageBudgetModel.create({ id, name: input.name, buckets })
    if (isErr(model)) throw new SemanticValidationError(model.error.message)

    await this.models.save(
      model.value,
      input.active,
      input.buckets.map((bucket) => ({ bucketId: bucket.id, accountCodes: bucket.accountCodes })),
    )
    return model.value
  }
}
