import { Injectable } from '@nestjs/common'
import type { CurrencyCode } from '../../../shared/kernel/currency.js'
import { Money } from '../../../shared/kernel/money.js'
import { unwrap } from '../../../shared/kernel/result.js'
import { SUBIR_VERSION, verificarEscritura } from '../../../shared/prisma/escribir-con-version.js'
import { PrismaService } from '../../../shared/prisma/prisma.service.js'
import type { Contribution } from '../domain/contribution.js'
import { Goal } from '../domain/goal.js'
import type { GoalRepository } from '../domain/goal-repository.port.js'

interface ContributionRow {
  id: string
  date: Date
  amountMinor: bigint
  currency: string
}

interface GoalRow {
  id: string
  name: string
  targetMinor: bigint
  currency: string
  desiredDate: Date
  priority: number
  accountCode: string | null
  active: boolean
  version: number
  contributions: ContributionRow[]
}

const toDomain = (row: GoalRow): Goal =>
  unwrap(
    Goal.create({
      id: row.id,
      name: row.name,
      target: Money.fromMinorUnits(row.targetMinor, row.currency as CurrencyCode),
      desiredDate: row.desiredDate,
      priority: row.priority,
      accountCode: row.accountCode,
      active: row.active,
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

const datosDe = (goal: Goal) => ({
  name: goal.name,
  targetMinor: goal.target.minorUnits,
  currency: goal.target.currency,
  desiredDate: goal.desiredDate,
  priority: goal.priority,
  accountCode: goal.accountCode,
  active: goal.active,
})

const WITH_CONTRIBUTIONS = { contributions: { orderBy: { date: 'asc' } } } as const

@Injectable()
export class PrismaGoalRepository implements GoalRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Goal[]> {
    const rows = await this.prisma.client.goal.findMany({
      include: WITH_CONTRIBUTIONS,
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    })
    return rows.map((row) => toDomain(row as GoalRow))
  }

  async findById(id: string): Promise<Goal | null> {
    const row = await this.prisma.client.goal.findUnique({
      where: { id },
      include: WITH_CONTRIBUTIONS,
    })
    return row ? toDomain(row as GoalRow) : null
  }

  async add(goal: Goal): Promise<void> {
    await this.prisma.client.goal.create({ data: { bookId: this.prisma.libro, id: goal.id, ...datosDe(goal) } })
  }

  // Los aportes no se reescriben al guardar la meta: tienen su propio camino de alta,
  // y sobrescribirlos acá convertiría una edición de nombre en un borrado de historia.
  async update(goal: Goal): Promise<Goal> {
    const { count } = await this.prisma.client.goal.updateMany({
      where: { id: goal.id, version: goal.version },
      data: { ...datosDe(goal), ...SUBIR_VERSION },
    })
    await verificarEscritura(count, async () => (await this.prisma.client.goal.count({ where: { id: goal.id } })) > 0)
    return goal.guardada()
  }

  async addContribution(goalId: string, contribution: Contribution): Promise<void> {
    await this.prisma.client.goal.updateMany({ where: { id: goalId }, data: SUBIR_VERSION })
    await this.prisma.client.goalContribution.create({
      data: {
        bookId: this.prisma.libro,
        id: contribution.id,
        goalId,
        date: contribution.date,
        amountMinor: contribution.amount.minorUnits,
        currency: contribution.amount.currency,
      },
    })
  }

  async delete(id: string): Promise<boolean> {
    const { count } = await this.prisma.client.goal.deleteMany({ where: { id } })
    return count > 0
  }
}
