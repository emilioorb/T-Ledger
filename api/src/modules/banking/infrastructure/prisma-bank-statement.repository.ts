import { Injectable } from '@nestjs/common'
import type { CurrencyCode } from '../../../shared/kernel/currency.js'
import type { DateRange } from '../../../shared/kernel/date-range.js'
import { Money } from '../../../shared/kernel/money.js'
import { PrismaService } from '../../../shared/prisma/prisma.service.js'
import type { BankLineStatus, ParsedLine, StoredBankLine } from '../domain/bank-line.js'
import { hashOfLine } from '../domain/bank-line-hash.js'
import type {
  BankLinePage,
  BankStatementRepository,
  ImportResult,
  StatementHeader,
  StoredStatement,
} from '../domain/bank-statement-repository.port.js'

interface BankLineRow {
  id: string
  statementId: string
  bankAccountId: string
  date: Date
  description: string
  reference: string | null
  amountMinor: bigint
  currency: string
  hash: string
  status: string
  movementId: string | null
}

const toDomain = (row: BankLineRow): StoredBankLine => ({
  id: row.id,
  statementId: row.statementId,
  bankAccountId: row.bankAccountId,
  date: row.date,
  description: row.description,
  reference: row.reference,
  amount: Money.fromMinorUnits(row.amountMinor, row.currency as CurrencyCode),
  hash: row.hash,
  status: row.status as BankLineStatus,
  movementId: row.movementId,
})

@Injectable()
export class PrismaBankStatementRepository implements BankStatementRepository {
  constructor(private readonly prisma: PrismaService) {}

  // La deduplicación la hace la base con skipDuplicates, apoyado en el índice único
  // [bankAccountId, hash]. Consultar primero qué hashes existen y después insertar dejaría una
  // ventana entre las dos consultas; así la decisión y la escritura son la misma operación.
  async save(statement: StatementHeader, lines: readonly ParsedLine[]): Promise<ImportResult> {
    const rows = lines.map((line) => ({
      statementId: statement.id,
      bankAccountId: statement.bankAccountId,
      date: line.date,
      description: line.description,
      reference: line.reference,
      amountMinor: line.amount.minorUnits,
      currency: line.amount.currency,
      hash: hashOfLine(statement.bankAccountId, line),
    }))

    return this.prisma.$transaction(async (tx) => {
      await tx.bankStatement.create({
        data: {
          id: statement.id,
          bankAccountId: statement.bankAccountId,
          fileName: statement.fileName,
        },
      })

      const { count } = await tx.bankLine.createMany({ data: rows, skipDuplicates: true })

      await tx.bankStatement.update({
        where: { id: statement.id },
        data: { lineCount: count, duplicateCount: rows.length - count },
      })

      return { imported: count, duplicated: rows.length - count }
    })
  }

  async findAll(
    page: number,
    pageSize: number,
  ): Promise<{ items: StoredStatement[]; totalItems: number }> {
    const [rows, totalItems] = await Promise.all([
      this.prisma.bankStatement.findMany({
        orderBy: { importedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.bankStatement.count(),
    ])

    return { items: rows, totalItems }
  }

  // Paginada: un extracto de un mes movido trae cientos de líneas, y la regla del proyecto es
  // que toda lista se pagina.
  async pendingLines(
    bankAccountId: string,
    range: DateRange,
    page: number,
    pageSize: number,
  ): Promise<BankLinePage> {
    const where = {
      bankAccountId,
      status: 'PENDING' as const,
      date: { gte: range.from, lte: range.to },
    }

    const [rows, totalItems] = await Promise.all([
      this.prisma.bankLine.findMany({
        where,
        orderBy: [{ date: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.bankLine.count({ where }),
    ])

    return { items: rows.map((row) => toDomain(row as BankLineRow)), totalItems }
  }

  // Todas las del rango, sin paginar: el saldo del extracto es la suma de sus líneas, y una
  // suma parcial daría una diferencia falsa.
  async allLines(bankAccountId: string, range: DateRange): Promise<StoredBankLine[]> {
    const rows = await this.prisma.bankLine.findMany({
      where: { bankAccountId, date: { gte: range.from, lte: range.to } },
      orderBy: [{ date: 'asc' }, { id: 'asc' }],
    })
    return rows.map((row) => toDomain(row as BankLineRow))
  }

  async findLine(id: string): Promise<StoredBankLine | null> {
    const row = await this.prisma.bankLine.findUnique({ where: { id } })
    return row ? toDomain(row as BankLineRow) : null
  }

  async isMovementTaken(movementId: string, exceptLineId?: string): Promise<boolean> {
    const count = await this.prisma.bankLine.count({
      where: {
        movementId,
        status: 'MATCHED',
        ...(exceptLineId ? { id: { not: exceptLineId } } : {}),
      },
    })
    return count > 0
  }

  async markMatched(lineId: string, movementId: string): Promise<void> {
    await this.prisma.bankLine.update({
      where: { id: lineId },
      data: { status: 'MATCHED', movementId },
    })
  }

  async markPending(lineId: string): Promise<void> {
    await this.prisma.bankLine.update({
      where: { id: lineId },
      data: { status: 'PENDING', movementId: null },
    })
  }

  async markIgnored(lineId: string): Promise<void> {
    await this.prisma.bankLine.update({
      where: { id: lineId },
      data: { status: 'IGNORED', movementId: null },
    })
  }
}
