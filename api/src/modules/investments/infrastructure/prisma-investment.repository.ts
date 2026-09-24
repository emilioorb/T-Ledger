import { Injectable } from '@nestjs/common'
import { Decimal } from 'decimal.js'
import type { CurrencyCode } from '../../../shared/kernel/currency.js'
import { InterestRate, type Compounding } from '../../../shared/kernel/interest-rate.js'
import { Money } from '../../../shared/kernel/money.js'
import { unwrap } from '../../../shared/kernel/result.js'
import { SUBIR_VERSION, verificarEscritura } from '../../../shared/prisma/escribir-con-version.js'
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
  version: number
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
      version: row.version,
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

const datosDe = (investment: Investment) => ({
  name: investment.name,
  principalMinor: investment.principal.minorUnits,
  currency: investment.principal.currency,
  annualRate: investment.rate.annualPercentage.toString(),
  compounding: investment.rate.compounding,
  openedAt: investment.openedAt,
  kind: investment.kind,
  maturesAt: investment.maturesAt,
  accountCode: investment.accountCode,
})

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

  async add(investment: Investment): Promise<void> {
    await this.prisma.client.investment.create({
      data: { bookId: this.prisma.libro, id: investment.id, ...datosDe(investment) },
    })
  }

  async update(investment: Investment): Promise<Investment> {
    const { count } = await this.prisma.client.investment.updateMany({
      where: { id: investment.id, version: investment.version },
      data: { ...datosDe(investment), ...SUBIR_VERSION },
    })
    await verificarEscritura(count, async () => (await this.prisma.client.investment.count({ where: { id: investment.id } })) > 0)
    return investment.guardada()
  }

  async addContribution(investmentId: string, contribution: InvestmentContribution): Promise<void> {
    await this.prisma.client.investment.updateMany({ where: { id: investmentId }, data: SUBIR_VERSION })
    await this.prisma.client.investmentContribution.create({
      data: {
        bookId: this.prisma.libro,
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
