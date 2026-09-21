import { Injectable } from '@nestjs/common'
import type { DateRange } from '../../../shared/kernel/date-range.js'
import { PrismaService } from '../../../shared/prisma/prisma.service.js'
import type { ExchangeRateRepository } from '../domain/exchange-rate-repository.port.js'
import type { ExchangeRate, RateIndicator } from '../domain/exchange-rate.js'
import { toDomain, type ExchangeRateRow } from './exchange-rate.mapper.js'

@Injectable()
export class PrismaExchangeRateRepository implements ExchangeRateRepository {
  constructor(private readonly prisma: PrismaService) {}

  // «Vigente en X» es la última publicación con fecha menor o igual a X.
  async findEffectiveAt(indicator: RateIndicator, date: Date): Promise<ExchangeRate | null> {
    const row = await this.prisma.exchangeRate.findFirst({
      where: { indicator, publishedAt: { lte: date } },
      orderBy: { publishedAt: 'desc' },
    })
    return row ? toDomain(row as ExchangeRateRow) : null
  }

  async findLatest(indicator: RateIndicator): Promise<ExchangeRate | null> {
    const row = await this.prisma.exchangeRate.findFirst({
      where: { indicator },
      orderBy: { publishedAt: 'desc' },
    })
    return row ? toDomain(row as ExchangeRateRow) : null
  }

  async findInRange(indicator: RateIndicator, range: DateRange): Promise<ExchangeRate[]> {
    const rows = await this.prisma.exchangeRate.findMany({
      where: { indicator, publishedAt: { gte: range.from, lte: range.to } },
      orderBy: { publishedAt: 'asc' },
    })
    return rows.map((row) => toDomain(row as ExchangeRateRow))
  }

  // El índice único sobre (indicator, publishedAt) es lo que hace idempotente al backfill.
  async saveMany(rates: readonly ExchangeRate[]): Promise<number> {
    const writes = rates.map((rate) =>
      this.prisma.exchangeRate.upsert({
        where: { indicator_publishedAt: { indicator: rate.indicator, publishedAt: rate.publishedAt } },
        create: {
          indicator: rate.indicator,
          publishedAt: rate.publishedAt,
          value: rate.value.toFixed(6),
        },
        update: { value: rate.value.toFixed(6) },
      }),
    )
    const results = await this.prisma.$transaction(writes)
    return results.length
  }
}
