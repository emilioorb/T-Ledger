import { randomUUID } from 'node:crypto'
import { Inject, Injectable } from '@nestjs/common'
import { Decimal } from 'decimal.js'
import { UNIT_OF_WORK, type UnitOfWork } from '../../../shared/prisma/unit-of-work.port.js'
import { RASTRO, type Rastro } from '../../auditoria/domain/rastro.port.js'
import { NotFoundError, SemanticValidationError } from '../../../shared/http/api-error.js'
import { Percentage } from '../../../shared/kernel/percentage.js'
import { isErr } from '../../../shared/kernel/result.js'
import { AccountGuard } from '../../accounting/application/account-guard.js'
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
  constructor(
    @Inject(BUDGET_MODEL_REPOSITORY) private readonly models: BudgetModelRepository,
    private readonly accounts: AccountGuard,
    @Inject(UNIT_OF_WORK) private readonly transaction: UnitOfWork,
    @Inject(RASTRO) private readonly rastro: Rastro,
  ) {}

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
    return this.save(randomUUID(), input, 'crear')
  }

  async update(id: string, input: BudgetModelInput): Promise<BudgetModel> {
    // La versión anterior se lee acá y viaja al guardado: `save` no puede leerla después de
    // escribir, y sin ella el rastro diría que el presupuesto cambió sin decir desde qué.
    const antes = await this.find(id)
    return this.save(id, input, 'editar', antes)
  }

  async mappingFor(id: string): Promise<BucketAccountCodes[]> {
    return this.models.mappingFor(id)
  }

  private async save(
    id: string,
    input: BudgetModelInput,
    accion: 'crear' | 'editar',
    antes?: BudgetModel,
  ): Promise<BudgetModel> {
    // Una cubeta que apunta a una cuenta agrupadora o inexistente consume siempre cero: el
    // presupuesto se ve sano y nadie lo nota hasta cerrar el mes.
    await this.accounts.assertAllPostable(input.buckets.flatMap((bucket) => bucket.accountCodes))

    const buckets = input.buckets.map((bucket) => {
      const percentage = Percentage.create(new Decimal(bucket.percentage))
      if (isErr(percentage)) throw new SemanticValidationError(percentage.error.message)
      return {
        id: bucket.id,
        name: bucket.name,
        percentage: percentage.value,
        isSavings: bucket.isSavings,
        colorIndex: bucket.colorIndex,
      }
    })

    const model = PercentageBudgetModel.create({ id, name: input.name, buckets })
    if (isErr(model)) throw new SemanticValidationError(model.error.message)

    await this.transaction.withTransaction(async () => {
      await this.models.save(
        model.value,
        input.active,
        input.buckets.map((bucket) => ({
          bucketId: bucket.id,
          accountCodes: bucket.accountCodes,
        })),
      )
      await this.rastro.registrar({
        entidad: 'presupuesto',
        entidadId: id,
        accion,
        // El modelo es una interfaz plana, sin `toProps`: va tal cual, y los porcentajes se
        // normalizan solos porque los decimales saben serializarse.
        ...(antes ? { antes } : {}),
        despues: model.value,
      })
    })

    return model.value
  }
}
