import { Injectable } from '@nestjs/common'
import { Money } from '../../../shared/kernel/money.js'
import type { CurrencyCode } from '../../../shared/kernel/currency.js'
import { unwrap } from '../../../shared/kernel/result.js'
import { SUBIR_VERSION, verificarEscritura } from '../../../shared/prisma/escribir-con-version.js'
import { PrismaService } from '../../../shared/prisma/prisma.service.js'
import { PeriodKey } from '../../accounting/domain/accounting-period.js'
import type { BudgetIncomeRepository } from '../domain/budget-income-repository.port.js'
import type { MonthlyIncome } from '../domain/budget-income.js'

const datosDe = (income: MonthlyIncome) => ({
  amountMinor: income.amount.minorUnits,
  currency: income.amount.currency,
})

@Injectable()
export class PrismaBudgetIncomeRepository implements BudgetIncomeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async find(period: PeriodKey): Promise<MonthlyIncome | null> {
    const row = await this.prisma.client.budgetIncome.findUnique({
      where: { bookId_period: { bookId: this.prisma.libro, period: period.toString() } },
    })
    if (!row) return null

    return {
      period: unwrap(PeriodKey.parse(row.period)),
      amount: Money.fromMinorUnits(row.amountMinor, row.currency as CurrencyCode),
      version: row.version,
    }
  }

  // El período es AAAA-MM, así que el orden lexicográfico es el cronológico.
  async findLatestUpTo(period: PeriodKey, currency: CurrencyCode): Promise<MonthlyIncome | null> {
    const row = await this.prisma.client.budgetIncome.findFirst({
      where: { period: { lte: period.toString() }, currency },
      orderBy: { period: 'desc' },
    })
    if (!row) return null

    return {
      period: unwrap(PeriodKey.parse(row.period)),
      amount: Money.fromMinorUnits(row.amountMinor, row.currency as CurrencyCode),
    }
  }

  async add(income: MonthlyIncome): Promise<void> {
    await this.prisma.client.budgetIncome.create({
      data: { bookId: this.prisma.libro, period: income.period.toString(), ...datosDe(income) },
    })
  }

  async update(income: MonthlyIncome & { version: number }): Promise<MonthlyIncome> {
    const period = income.period.toString()
    const { count } = await this.prisma.client.budgetIncome.updateMany({
      where: { period, version: income.version },
      data: { ...datosDe(income), ...SUBIR_VERSION },
    })
    await verificarEscritura(count, async () => (await this.prisma.client.budgetIncome.count({ where: { period } })) > 0)
    return { ...income, version: income.version + 1 }
  }
}
