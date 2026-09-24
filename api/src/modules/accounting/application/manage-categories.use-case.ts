import { randomUUID } from 'node:crypto'
import { Inject, Injectable } from '@nestjs/common'
import { NotFoundError, SemanticValidationError } from '../../../shared/http/api-error.js'
import { isErr } from '../../../shared/kernel/result.js'
import { exigirVersion } from '../../../shared/prisma/escribir-con-version.js'
import { UNIT_OF_WORK, type UnitOfWork } from '../../../shared/prisma/unit-of-work.port.js'
import { ACCOUNT_REPOSITORY, type AccountRepository } from '../domain/account-repository.port.js'
import { CATEGORY_REPOSITORY, type CategoryRepository } from '../domain/category-repository.port.js'
import { Category, type CategoryProps } from '../domain/category.js'
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
} from '../infrastructure/accounting.schemas.js'

@Injectable()
export class ManageCategoriesUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY) private readonly categories: CategoryRepository,
    @Inject(ACCOUNT_REPOSITORY) private readonly accounts: AccountRepository,
    @Inject(UNIT_OF_WORK) private readonly transaction: UnitOfWork,
  ) {}

  async list(): Promise<Category[]> {
    return this.categories.findAll()
  }

  // Lo que escribe va en transacción: toma el candado del libro, y la cuenta de la regla se lee
  // adentro (ADR-006).
  async create(input: CreateCategoryInput): Promise<Category> {
    return this.transaction.withTransaction(() => this.save({ id: randomUUID(), ...input }))
  }

  async update(id: string, input: UpdateCategoryInput): Promise<Category> {
    return this.transaction.withTransaction(() => this.actualizar(id, input))
  }

  private async actualizar(id: string, { version, ...input }: UpdateCategoryInput): Promise<Category> {
    const actual = await this.find(id)
    exigirVersion(version, actual.version, 'editar una categoría')
    const props = actual.toProps()
    const guardada = await this.save({
      ...props,
      name: input.name ?? props.name,
      kind: input.kind ?? props.kind,
      accountCode: input.accountCode === undefined ? props.accountCode : input.accountCode,
      sortOrder: input.sortOrder ?? props.sortOrder,
      active: input.active ?? props.active,
      // `undefined` y no `??`: quien manda `null` está pidiendo volver al color automático, y
      // con `??` esa elección se perdía contra el color que ya tenía.
      colorIndex: input.colorIndex === undefined ? props.colorIndex : input.colorIndex,
    })
    return guardada.guardada()
  }

  async delete(id: string, version?: number): Promise<void> {
    await this.transaction.withTransaction(async () => {
      const actual = await this.find(id)
      exigirVersion(version, actual.version, 'borrar una categoría')
      await this.categories.delete(id)
    })
  }

  async find(id: string): Promise<Category> {
    const category = await this.categories.findById(id)
    if (!category) throw new NotFoundError(`La categoría ${id} no existe.`)
    return category
  }

  // Una categoría que apunta a una cuenta agrupadora produciría movimientos que no se
  // pueden asentar, y el error aparecería recién al cargar el primer gasto.
  private async save(props: CategoryProps): Promise<Category> {
    const category = Category.create(props)
    if (isErr(category)) throw new SemanticValidationError(category.error.message)

    if (props.accountCode !== null) {
      const chart = await this.accounts.loadChart()
      if (!chart.isPostable(props.accountCode)) {
        throw new SemanticValidationError(
          `La cuenta ${props.accountCode} no acepta asientos: es agrupadora o está inactiva.`,
        )
      }
    }

    await this.categories.save(category.value)
    return category.value
  }
}
