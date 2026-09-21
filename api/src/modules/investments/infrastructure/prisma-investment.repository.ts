import { Injectable } from '@nestjs/common'
import { Decimal } from 'decimal.js'
import type { CurrencyCode } from '../../../shared/kernel/currency.js'
import { InterestRate, type Compounding } from '../../../shared/kernel/interest-rate.js'
import { Money } from '../../../shared/kernel/money.js'
import { unwrap } from '../../../shared/kernel/result.js'
import { PrismaService } from '../../../shared/prisma/prisma.service.js'
import {
  Investment,
  type InvestmentContribution,
  type InvestmentKind,
} from '../domain/investment.js'
import type { InvestmentRepository } from '../domain/investment-repository.port.js'

interface ContributionRow {
  id: string
  date: Date
  amountMinor: bigint
  currency: string
}

interface InvestmentRow {
  id: string
  name: string
  principalMinor: bigint
  currency: string
  annualRate: Decimal.Value
  compounding: string
  openedAt: Date
  kind: string
  maturesAt: Date | null
  accountCode: string | null
  contributions: ContributionRow[]
}

const toDomain = (row: InvestmentRow): Investment =>
  unwrap(
    Investment.create({
      id: row.id,
      name: row.name,
      principal: Money.fromMinorUnits(row.principalMinor, row.currency as CurrencyCode),
      rate: unwrap(
        InterestRate.create(new Decimal(row.annualRate.toString()), row.compounding as Compounding),
      ),
      openedAt: row.openedAt,
      kind: row.kind as InvestmentKind,
      maturesAt: row.maturesAt,
      accountCode: row.accountCode,
      contributions: row.contributions.map((contribution) => ({
        id: contribution.id,
        date: contribution.date,
        amount: Money.fromMinorUnits(
          contribution.amountMinor,
          contribution.currency as CurrencyCode,
        ),
      })),
    }),
  )

const WITH_CONTRIBUTIONS = { contributions: { orderBy: { date: 'asc' } } } as const

@Injectable()
export class PrismaInvestmentRepository implements InvestmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Investment[]> {
    const rows = await this.prisma.client.investment.findMany({
      include: WITH_CONTRIBUTIONS,
      orderBy: { createdAt: 'asc' },
    })
    return rows.map((row) => toDomain(row as InvestmentRow))
  }

  async findById(id: string): Promise<Investment | null> {
    const row = await this.prisma.client.investment.findUnique({
      where: { id },
      include: WITH_CONTRIBUTIONS,
    })
    return row ? toDomain(row as InvestmentRow) : null
  }

  async save(investment: Investment): Promise<void> {
    const data = {
      name: investment.name,
      principalMinor: investment.principal.minorUnits,
      currency: investment.principal.currency,
      annualRate: investment.rate.annualPercentage.toString(),
      compounding: investment.rate.compounding,
      openedAt: investment.openedAt,
      kind: investment.kind,
      maturesAt: investment.maturesAt,
      accountCode: investment.accountCode,
    }
    await this.prisma.client.investment.upsert({
      where: { id: investment.id },
      create: { id: investment.id, ...data },
      update: data,
    })
  }

  async addContribution(investmentId: string, contribution: InvestmentContribution): Promise<void> {
    await this.prisma.client.investmentContribution.create({
      data: {
        id: contribution.id,
        investmentId,
        date: contribution.date,
        amountMinor: contribution.amount.minorUnits,
        currency: contribution.amount.currency,
      },
    })
  }

  async delete(id: string): Promise<boolean> {
    const { count } = await this.prisma.client.investment.deleteMany({ where: { id } })
    return count > 0
  }
}
