import { Injectable } from '@nestjs/common'
import { Decimal } from 'decimal.js'
import { Percentage } from '../../../shared/kernel/percentage.js'
import { unwrap } from '../../../shared/kernel/result.js'
import { SUBIR_VERSION, verificarEscritura } from '../../../shared/prisma/escribir-con-version.js'
import { PrismaService } from '../../../shared/prisma/prisma.service.js'
import type { BudgetModel } from '../domain/budget-model.js'
import type {
  BucketAccountCodes,
  BudgetModelRepository,
} from '../domain/budget-model-repository.port.js'
import { PercentageBudgetModel } from '../domain/percentage-budget-model.js'

interface BucketRow {
  bucketKey: string
  name: string
  percentage: Decimal.Value
  isSavings: boolean
  sortOrder: number
  accountCodes: string[]
  colorIndex: number | null
}

interface ModelRow {
  id: string
  name: string
  version: number
  buckets: BucketRow[]
}

const toDomain = (row: ModelRow): BudgetModel =>
  unwrap(
    PercentageBudgetModel.create({
      id: row.id,
      name: row.name,
      version: row.version,
      buckets: [...row.buckets]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((bucket) => ({
          id: bucket.bucketKey,
          name: bucket.name,
          percentage: unwrap(Percentage.create(new Decimal(bucket.percentage.toString()))),
          isSavings: bucket.isSavings,
          colorIndex: bucket.colorIndex,
        })),
    }),
  )

const WITH_BUCKETS = { buckets: true } as const

@Injectable()
export class PrismaBudgetModelRepository implements BudgetModelRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<BudgetModel[]> {
    const rows = await this.prisma.client.budgetModel.findMany({
      include: WITH_BUCKETS,
      orderBy: { createdAt: 'asc' },
    })
    return rows.map((row) => toDomain(row as ModelRow))
  }

  async findById(id: string): Promise<BudgetModel | null> {
    const row = await this.prisma.client.budgetModel.findUnique({
      where: { id },
      include: WITH_BUCKETS,
    })
    return row ? toDomain(row as ModelRow) : null
  }

  async findActive(): Promise<BudgetModel | null> {
    const row = await this.prisma.client.budgetModel.findFirst({
      where: { active: true },
      include: WITH_BUCKETS,
    })
    return row ? toDomain(row as ModelRow) : null
  }

  // Activar uno desactiva el resto, en la misma transacción: dos presupuestos activos
  // dejarían la evaluación del mes dependiendo del orden de la consulta.
  async add(model: BudgetModel, active: boolean, mapping: readonly BucketAccountCodes[]): Promise<void> {
    if (active) await this.apagarLosDemas(model.id)
    await this.prisma.client.budgetModel.create({
      data: { bookId: this.prisma.libro, id: model.id, name: model.name, active },
    })
    await this.prisma.client.budgetBucket.createMany({
      data: model.buckets.map((bucket, index) => this.filaDe(model.id, bucket, index, mapping)),
    })
  }

  async update(model: BudgetModel, active: boolean, mapping: readonly BucketAccountCodes[]): Promise<BudgetModel> {
    const { count } = await this.prisma.client.budgetModel.updateMany({
      where: { id: model.id, version: model.version },
      data: { name: model.name, active, ...SUBIR_VERSION },
    })
    await verificarEscritura(count, async () => (await this.prisma.client.budgetModel.count({ where: { id: model.id } })) > 0)
    if (active) await this.apagarLosDemas(model.id)
    await this.diferenciarCubetas(model, mapping)
    return model.guardado()
  }

  private async apagarLosDemas(id: string): Promise<void> {
    await this.prisma.client.budgetModel.updateMany({
      where: { active: true, id: { not: id } },
      data: { active: false, ...SUBIR_VERSION },
    })
  }

  // Por la clave de la cubeta: la que se quitó se borra, la que sigue se actualiza y la nueva se
  // crea. Borrar y recrear todas cambiaba la identidad de las que no se tocaron.
  private async diferenciarCubetas(model: BudgetModel, mapping: readonly BucketAccountCodes[]): Promise<void> {
    const claves = model.buckets.map((bucket) => bucket.id)
    await this.prisma.client.budgetBucket.deleteMany({ where: { modelId: model.id, bucketKey: { notIn: claves } } })
    const existentes = new Set(
      (
        await this.prisma.client.budgetBucket.findMany({ where: { modelId: model.id }, select: { bucketKey: true } })
      ).map((fila) => fila.bucketKey),
    )
    for (const [index, bucket] of model.buckets.entries()) {
      const { bookId, modelId, bucketKey, ...cambios } = this.filaDe(model.id, bucket, index, mapping)
      if (existentes.has(bucket.id)) {
        await this.prisma.client.budgetBucket.updateMany({ where: { modelId, bucketKey }, data: cambios })
      } else {
        await this.prisma.client.budgetBucket.create({ data: { bookId, modelId, bucketKey, ...cambios } })
      }
    }
  }

  private filaDe(
    modelId: string,
    bucket: BudgetModel['buckets'][number],
    index: number,
    mapping: readonly BucketAccountCodes[],
  ) {
    return {
      bookId: this.prisma.libro,
      modelId,
      bucketKey: bucket.id,
      name: bucket.name,
      percentage: bucket.percentage.value.toString(),
      isSavings: bucket.isSavings,
      sortOrder: index,
      accountCodes: [...(mapping.find((entry) => entry.bucketId === bucket.id)?.accountCodes ?? [])],
      colorIndex: bucket.colorIndex,
    }
  }

  async mappingFor(modelId: string): Promise<BucketAccountCodes[]> {
    const rows = await this.prisma.client.budgetBucket.findMany({
      where: { modelId },
      orderBy: { sortOrder: 'asc' },
    })
    return rows.map((row) => ({ bucketId: row.bucketKey, accountCodes: row.accountCodes }))
  }
}
