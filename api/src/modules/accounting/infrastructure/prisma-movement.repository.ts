import { Injectable } from '@nestjs/common'
import type { DateRange } from '../../../shared/kernel/date-range.js'
import { PrismaService } from '../../../shared/prisma/prisma.service.js'
import { PeriodKey } from '../domain/accounting-period.js'
import type { Movement } from '../domain/movement.js'
import type {
  MovementFilters,
  MovementPage,
  MovementRepository,
} from '../domain/movement-repository.port.js'
import { monthsOf, movementToDomain, type MovementRow } from './accounting.mappers.js'

@Injectable()
export class PrismaMovementRepository implements MovementRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: MovementFilters, page: number, pageSize: number): Promise<MovementPage> {
    const where = {
      ...(filters.kind ? { kind: filters.kind } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(filters.range ? { date: { gte: filters.range.from, lte: filters.range.to } } : {}),
      ...(filters.search
        ? { counterparty: { contains: filters.search, mode: 'insensitive' as const } }
        : {}),
    }

    const [rows, totalItems] = await Promise.all([
      this.prisma.client.movement.findMany({
        where,
        orderBy: [{ date: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.client.movement.count({ where }),
    ])

    return { items: rows.map((row) => movementToDomain(row as MovementRow)), totalItems }
  }

  async findByPaymentAccount(accountCode: string, range: DateRange): Promise<Movement[]> {
    const rows = await this.prisma.client.movement.findMany({
      where: {
        status: 'ACTIVE',
        paymentAccountCode: accountCode,
        date: { gte: range.from, lte: range.to },
      },
      orderBy: [{ date: 'asc' }, { id: 'asc' }],
    })
    return rows.map((row) => movementToDomain(row as MovementRow))
  }

  async findById(id: string): Promise<Movement | null> {
    const row = await this.prisma.client.movement.findUnique({ where: { id } })
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
    await this.prisma.client.movement.upsert({
      where: { id: movement.id },
      create: { id: movement.id, ...data },
      update: data,
    })
  }

  // Un movimiento anulado no cuenta: su falta de asiento es el estado esperado.
  async countUnposted(range: DateRange): Promise<number> {
    const candidates = await this.prisma.client.movement.findMany({
      where: { status: 'ACTIVE', date: { gte: range.from, lte: range.to } },
      select: { id: true },
    })
    if (candidates.length === 0) return 0

    const posted = await this.prisma.client.journalEntry.findMany({
      where: { sourceMovementId: { in: candidates.map((row) => row.id) } },
      select: { sourceMovementId: true },
    })
    const postedIds = new Set(posted.map((row) => row.sourceMovementId))

    return candidates.filter((row) => !postedIds.has(row.id)).length
  }

  async monthsWithMovements(): Promise<PeriodKey[]> {
    const rows = await this.prisma.client.movement.findMany({
      distinct: ['date'],
      select: { date: true },
      orderBy: { date: 'asc' },
    })
    return monthsOf(rows)
  }
}
