import { Injectable } from '@nestjs/common'
import type { CurrencyCode } from '../../../shared/kernel/currency.js'
import type { DateRange } from '../../../shared/kernel/date-range.js'
import { PrismaService } from '../../../shared/prisma/prisma.service.js'
import type { ChartOfAccounts } from '../domain/chart-of-accounts.js'
import type { JournalEntry } from '../domain/journal-entry.js'
import type {
  AccountMovementTotals,
  JournalPage,
  JournalRepository,
} from '../domain/journal-repository.port.js'
import { journalEntryToDomain, type JournalEntryRow } from './accounting.mappers.js'
import { PrismaAccountRepository } from './prisma-account.repository.js'

const ENTRY_INCLUDE = { lines: true } as const

// Pliega el resultado de un groupBy por cuenta y lado a un total por cuenta.
const foldTotals = (
  rows: readonly { accountCode: string; side: string; _sum: { amountMinor: bigint | null } }[],
): AccountMovementTotals[] => {
  const byAccount = new Map<string, { debits: bigint; credits: bigint }>()

  for (const row of rows) {
    const current = byAccount.get(row.accountCode) ?? { debits: 0n, credits: 0n }
    const amount = row._sum.amountMinor ?? 0n
    byAccount.set(
      row.accountCode,
      row.side === 'DEBIT'
        ? { debits: current.debits + amount, credits: current.credits }
        : { debits: current.debits, credits: current.credits + amount },
    )
  }

  return [...byAccount.entries()]
    .map(([accountCode, totals]) => ({ accountCode, ...totals }))
    .sort((a, b) => a.accountCode.localeCompare(b.accountCode))
}

@Injectable()
export class PrismaJournalRepository implements JournalRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: PrismaAccountRepository,
  ) {}

  async save(entry: JournalEntry): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.journalEntry.upsert({
        where: { id: entry.id },
        create: {
          id: entry.id,
          date: entry.date,
          description: entry.description,
          reference: entry.reference,
          sourceMovementId: entry.sourceMovementId,
          reversesEntryId: entry.reversesEntryId,
        },
        update: { description: entry.description, reference: entry.reference },
      }),
      this.prisma.journalLine.deleteMany({ where: { entryId: entry.id } }),
      this.prisma.journalLine.createMany({
        data: entry.lines.map((line) => ({
          entryId: entry.id,
          accountCode: line.accountCode,
          currency: line.amount.currency,
          amountMinor: line.amount.minorUnits,
          side: line.side,
        })),
      }),
    ])
  }

  async findById(id: string): Promise<JournalEntry | null> {
    const row = await this.prisma.journalEntry.findUnique({ where: { id }, include: ENTRY_INCLUDE })
    if (!row) return null
    return journalEntryToDomain(row as JournalEntryRow, await this.accounts.loadChart())
  }

  async findByMovementId(movementId: string): Promise<JournalEntry[]> {
    const rows = await this.prisma.journalEntry.findMany({
      where: { sourceMovementId: movementId },
      include: ENTRY_INCLUDE,
      orderBy: { date: 'asc' },
    })
    const chart = await this.accounts.loadChart()
    return rows.map((row) => journalEntryToDomain(row as JournalEntryRow, chart))
  }

  async findInRange(range: DateRange, page: number, pageSize: number): Promise<JournalPage> {
    const where = { date: { gte: range.from, lte: range.to } }
    const [rows, totalItems] = await Promise.all([
      this.prisma.journalEntry.findMany({
        where,
        include: ENTRY_INCLUDE,
        orderBy: [{ date: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.journalEntry.count({ where }),
    ])
    const chart = await this.accounts.loadChart()
    return { items: rows.map((row) => journalEntryToDomain(row as JournalEntryRow, chart)), totalItems }
  }

  // Los reportes agregan en la base. Una comprobación de doce meses sobre miles de
  // asientos no puede traérselos todos para sumarlos en Node.
  async totalsByAccount(currency: CurrencyCode, range: DateRange): Promise<AccountMovementTotals[]> {
    const rows = await this.prisma.journalLine.groupBy({
      by: ['accountCode', 'side'],
      where: { currency, entry: { date: { gte: range.from, lte: range.to } } },
      _sum: { amountMinor: true },
    })
    return foldTotals(rows)
  }

  async totalsUpTo(currency: CurrencyCode, at: Date): Promise<AccountMovementTotals[]> {
    const rows = await this.prisma.journalLine.groupBy({
      by: ['accountCode', 'side'],
      where: { currency, entry: { date: { lte: at } } },
      _sum: { amountMinor: true },
    })
    return foldTotals(rows)
  }

  // El mayor sí trae asientos, pero acotado a una cuenta y una moneda: es lo que muestra.
  async ledgerFor(
    accountCode: string,
    currency: CurrencyCode,
    range: DateRange,
  ): Promise<JournalEntry[]> {
    const rows = await this.prisma.journalEntry.findMany({
      where: {
        date: { gte: range.from, lte: range.to },
        lines: { some: { accountCode, currency } },
      },
      include: ENTRY_INCLUDE,
      orderBy: [{ date: 'asc' }, { id: 'asc' }],
    })
    const chart = await this.accounts.loadChart()
    return rows.map((row) => journalEntryToDomain(row as JournalEntryRow, chart))
  }

  async openingBalanceFor(
    accountCode: string,
    currency: CurrencyCode,
    before: Date,
  ): Promise<{ debits: bigint; credits: bigint }> {
    const rows = await this.prisma.journalLine.groupBy({
      by: ['side'],
      where: { accountCode, currency, entry: { date: { lt: before } } },
      _sum: { amountMinor: true },
    })

    return rows.reduce(
      (acc, row) =>
        row.side === 'DEBIT'
          ? { debits: acc.debits + (row._sum.amountMinor ?? 0n), credits: acc.credits }
          : { debits: acc.debits, credits: acc.credits + (row._sum.amountMinor ?? 0n) },
      { debits: 0n, credits: 0n },
    )
  }
}
