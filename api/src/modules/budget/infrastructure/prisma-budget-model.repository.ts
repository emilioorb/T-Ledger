import { Injectable } from '@nestjs/common'
import { Decimal } from 'decimal.js'
import { Percentage } from '../../../shared/kernel/percentage.js'
import { unwrap } from '../../../shared/kernel/result.js'
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
}

interface ModelRow {
  id: string
  name: string
  buckets: BucketRow[]
}

const toDomain = (row: ModelRow): BudgetModel =>
  unwrap(
    PercentageBudgetModel.create({
      id: row.id,
      name: row.name,
      buckets: [...row.buckets]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((bucket) => ({
          id: bucket.bucketKey,
          name: bucket.name,
          percentage: unwrap(Percentage.create(new Decimal(bucket.percentage.toString()))),
          isSavings: bucket.isSavings,
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
  async save(
    model: BudgetModel,
    active: boolean,
    mapping: readonly BucketAccountCodes[],
  ): Promise<void> {
    const codesOf = new Map(mapping.map((entry) => [entry.bucketId, [...entry.accountCodes]]))

    await this.prisma.withTransaction(async () => {
      const db = this.prisma.client
      if (active) {
        await db.budgetModel.updateMany({ where: { active: true }, data: { active: false } })
      }

      await db.budgetModel.upsert({
        where: { id: model.id },
        create: { id: model.id, name: model.name, active },
        update: { name: model.name, active },
      })

      await db.budgetBucket.deleteMany({ where: { modelId: model.id } })
      await db.budgetBucket.createMany({
        data: model.buckets.map((bucket, index) => ({
          modelId: model.id,
          bucketKey: bucket.id,
          name: bucket.name,
          percentage: bucket.percentage.value.toString(),
          isSavings: bucket.isSavings,
          sortOrder: index,
          accountCodes: codesOf.get(bucket.id) ?? [],
        })),
      })
    })
  }

  async mappingFor(modelId: string): Promise<BucketAccountCodes[]> {
    const rows = await this.prisma.client.budgetBucket.findMany({
      where: { modelId },
      orderBy: { sortOrder: 'asc' },
    })
    return rows.map((row) => ({ bucketId: row.bucketKey, accountCodes: row.accountCodes }))
  }
}
