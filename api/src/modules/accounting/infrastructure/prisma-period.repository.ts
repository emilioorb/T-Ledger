import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../shared/prisma/prisma.service.js'
import type { AccountingPeriod, PeriodKey } from '../domain/accounting-period.js'
import type { PeriodRepository } from '../domain/period-repository.port.js'
import { periodToDomain, type PeriodRow } from './accounting.mappers.js'

@Injectable()
export class PrismaPeriodRepository implements PeriodRepository {
  constructor(private readonly prisma: PrismaService) {}

  async find(key: PeriodKey): Promise<AccountingPeriod | null> {
    const row = await this.prisma.client.accountingPeriod.findUnique({
      where: { bookId_period: { bookId: this.prisma.libro, period: key.toString() } },
    })
    return row ? periodToDomain(row as PeriodRow) : null
  }

  async findAll(): Promise<AccountingPeriod[]> {
    const rows = await this.prisma.client.accountingPeriod.findMany({ orderBy: { period: 'asc' } })
    return rows.map((row) => periodToDomain(row as PeriodRow))
  }

  // El identificador es AAAA-MM, que ordena cronológicamente como texto.
  async findClosedAfter(key: PeriodKey): Promise<AccountingPeriod[]> {
    const rows = await this.prisma.client.accountingPeriod.findMany({
      where: { period: { gt: key.toString() }, status: 'CLOSED' },
      orderBy: { period: 'asc' },
    })
    return rows.map((row) => periodToDomain(row as PeriodRow))
  }

  async save(period: AccountingPeriod): Promise<void> {
    await this.saveMany([period])
  }

  async saveMany(periods: readonly AccountingPeriod[]): Promise<void> {
    await this.prisma.withTransaction(async () => {
      for (const period of periods) {
        const data = { status: period.status, closedAt: period.closedAt }
        await this.prisma.client.accountingPeriod.upsert({
          where: { bookId_period: { bookId: this.prisma.libro, period: period.key.toString() } },
          create: { bookId: this.prisma.libro, period: period.key.toString(), ...data },
          update: data,
        })
      }
    })
  }
}
