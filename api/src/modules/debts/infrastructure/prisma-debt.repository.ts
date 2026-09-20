import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../shared/prisma/prisma.service.js'
import type { Debt, DebtDirection } from '../domain/debt.js'
import type { DebtPage, DebtRepository } from '../domain/debt-repository.port.js'
import { toDomain, toRow, type DebtRow } from './debt.mapper.js'

@Injectable()
export class PrismaDebtRepository implements DebtRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page: number, pageSize: number, direction?: DebtDirection): Promise<DebtPage> {
    const where = direction ? { direction } : {}
    const [rows, totalItems] = await Promise.all([
      this.prisma.debt.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.debt.count({ where }),
    ])
    return { items: rows.map((row) => toDomain(row as DebtRow)), totalItems }
  }

  async findById(id: string): Promise<Debt | null> {
    const row = await this.prisma.debt.findUnique({ where: { id } })
    return row ? toDomain(row as DebtRow) : null
  }

  async save(debt: Debt): Promise<void> {
    const row = toRow(debt)
    const { id, ...rest } = row
    await this.prisma.debt.upsert({
      where: { id },
      create: { id, ...rest },
      update: rest,
    })
  }

  async delete(id: string): Promise<boolean> {
    const { count } = await this.prisma.debt.deleteMany({ where: { id } })
    return count > 0
  }
}
