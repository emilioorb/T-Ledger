import { randomUUID } from 'node:crypto'
import { Inject, Injectable } from '@nestjs/common'
import { Decimal } from 'decimal.js'
import { exigirVersion } from '../../../shared/prisma/escribir-con-version.js'
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
import type { BudgetModelInput, UpdateBudgetModelInput } from '../infrastructure/budget.schemas.js'

export interface StoredBudgetModel {
  readonly model: BudgetModel
  readonly active: boolean
  readonly mapping: BucketAccountCodes[]
}

const mappingDe = (input: BudgetModelInput): BucketAccountCodes[] =>
  input.buckets.map((bucket) => ({ bucketId: bucket.id, accountCodes: bucket.accountCodes }))

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

  // Todo adentro del candado del libro: el modelo, el activo y las cuentas se leen ahí (ADR-006).
  create(input: BudgetModelInput): Promise<BudgetModel> {
    return this.transaction.withTransaction(async () => {
      const model = await this.armar(randomUUID(), input)
      await this.models.add(model, input.active, mappingDe(input))
      await this.registrar('crear', model)
      return model
    })
  }

  update(id: string, { version, ...input }: UpdateBudgetModelInput): Promise<BudgetModel> {
    return this.transaction.withTransaction(async () => {
      // El anterior viaja al rastro: sin él diría que el presupuesto cambió sin decir desde qué.
      const antes = await this.find(id)
      exigirVersion(version, antes.version, 'editar un modelo de presupuesto')
      const model = await this.armar(id, input, antes.version)
      const guardado = await this.models.update(model, input.active, mappingDe(input))
      await this.registrar('editar', model, antes)
      return guardado
    })
  }

  async mappingFor(id: string): Promise<BucketAccountCodes[]> {
    return this.models.mappingFor(id)
  }

  private async armar(id: string, input: BudgetModelInput, version?: number): Promise<BudgetModel> {
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

    const model = PercentageBudgetModel.create({ id, name: input.name, buckets, ...(version === undefined ? {} : { version }) })
    if (isErr(model)) throw new SemanticValidationError(model.error.message)
    return model.value
  }

  private async registrar(accion: 'crear' | 'editar', model: BudgetModel, antes?: BudgetModel): Promise<void> {
    await this.rastro.registrar({
      entidad: 'presupuesto',
      entidadId: model.id,
      accion,
      // El modelo es una interfaz plana, sin `toProps`: va tal cual, y los porcentajes se
      // normalizan solos porque los decimales saben serializarse.
      ...(antes ? { antes } : {}),
      despues: model,
    })
  }
}
