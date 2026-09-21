import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../shared/prisma/prisma.service.js'
import type { Movement } from '../domain/movement.js'
import type {
  MovementFilters,
  MovementPage,
  MovementRepository,
} from '../domain/movement-repository.port.js'
import { movementToDomain, type MovementRow } from './accounting.mappers.js'

@Injectable()
export class PrismaMovementRepository implements MovementRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: MovementFilters, page: number, pageSize: number): Promise<MovementPage> {
    const where = {
      ...(filters.kind ? { kind: filters.kind } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(filters.range ? { date: { gte: filters.range.from, lte: filters.range.to } } : {}),
    }

    const [rows, totalItems] = await Promise.all([
      this.prisma.movement.findMany({
        where,
        orderBy: [{ date: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.movement.count({ where }),
    ])

    return { items: rows.map((row) => movementToDomain(row as MovementRow)), totalItems }
  }

  async findById(id: string): Promise<Movement | null> {
    const row = await this.prisma.movement.findUnique({ where: { id } })
    return row ? movementToDomain(row as MovementRow) : null
  }

  async save(movement: Movement): Promise<void> {
    const data = {
      date: movement.date,
      kind: movement.kind,
      categoryId: movement.categoryId,
      counterparty: movement.counterparty,
      amountMinor: movement.amount.minorUnits,
      currency: movement.amount.currency,
      paymentAccountCode: movement.paymentAccountCode,
      receiptUrl: movement.receiptUrl,
      status: movement.status,
    }
    await this.prisma.movement.upsert({
      where: { id: movement.id },
      create: { id: movement.id, ...data },
      update: data,
    })
  }
}
