import { Injectable } from '@nestjs/common'
import { Money } from '../../../shared/kernel/money.js'
import type { CurrencyCode } from '../../../shared/kernel/currency.js'
import { unwrap } from '../../../shared/kernel/result.js'
import { PrismaService } from '../../../shared/prisma/prisma.service.js'
import { PeriodKey } from '../../accounting/domain/accounting-period.js'
import type { BudgetIncomeRepository } from '../domain/budget-income-repository.port.js'
import type { MonthlyIncome } from '../domain/budget-income.js'

@Injectable()
export class PrismaBudgetIncomeRepository implements BudgetIncomeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async find(period: PeriodKey): Promise<MonthlyIncome | null> {
    const row = await this.prisma.client.budgetIncome.findUnique({
      where: { period: period.toString() },
    })
    if (!row) return null

    return {
      period: unwrap(PeriodKey.parse(row.period)),
      amount: Money.fromMinorUnits(row.amountMinor, row.currency as CurrencyCode),
    }
  }

  // El período es AAAA-MM, así que el orden lexicográfico es el cronológico.
  async findLatestUpTo(period: PeriodKey): Promise<MonthlyIncome | null> {
    const row = await this.prisma.client.budgetIncome.findFirst({
      where: { period: { lte: period.toString() } },
      orderBy: { period: 'desc' },
    })
    if (!row) return null

    return {
      period: unwrap(PeriodKey.parse(row.period)),
      amount: Money.fromMinorUnits(row.amountMinor, row.currency as CurrencyCode),
    }
  }

  async save(income: MonthlyIncome): Promise<void> {
    const data = {
      amountMinor: income.amount.minorUnits,
      currency: income.amount.currency,
    }
    await this.prisma.client.budgetIncome.upsert({
      where: { period: income.period.toString() },
      create: { period: income.period.toString(), ...data },
      update: data,
    })
  }
}
