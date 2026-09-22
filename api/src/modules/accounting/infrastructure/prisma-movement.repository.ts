import { Injectable } from '@nestjs/common'
import type { DateRange } from '../../../shared/kernel/date-range.js'
import { PrismaService } from '../../../shared/prisma/prisma.service.js'
import { PeriodKey } from '../domain/accounting-period.js'
import type { Movement } from '../domain/movement.js'
import type { CurrencyCode } from '../../../shared/kernel/currency.js'
import { Money } from '../../../shared/kernel/money.js'
import type {
  CategoryTotal,
  MovementFilters,
  MovementPage,
  MovementRepository,
} from '../domain/movement-repository.port.js'
import { monthsOf, movementToDomain, type MovementRow } from './accounting.mappers.js'

@Injectable()
export class PrismaMovementRepository implements MovementRepository {
  constructor(private readonly prisma: PrismaService) {}

  // El mismo `where` para listar y para resumir: dos copias se separan en cuanto alguien
  // agregue un filtro, y entonces la barra deja de hablar de la tabla que tiene debajo.
  private whereOf(filters: MovementFilters) {
    return {
      ...(filters.kind ? { kind: filters.kind } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(filters.range ? { date: { gte: filters.range.from, lte: filters.range.to } } : {}),
      ...(filters.search
        ? { counterparty: { contains: filters.search, mode: 'insensitive' as const } }
        : {}),
    }
  }

  async findAll(filters: MovementFilters, page: number, pageSize: number): Promise<MovementPage> {
    const where = this.whereOf(filters)

    const [rows, totalItems] = await Promise.all([
      this.prisma.client.movement.findMany({
        where,
        orderBy: [{ date: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.client.movement.count({ where }),
    ])

    return { items: rows.map((row) => movementToDomain(row as MovementRow)), totalItems }
  }

  async totalsByCategory(filters: MovementFilters): Promise<CategoryTotal[]> {
    // Pedir la composición de los anulados no tiene respuesta: no se gastaron. Se devuelve
    // vacío y la barra desaparece. Medido en pantalla: sin esto, con el filtro en «Anulados»
    // la tabla mostraba un movimiento de ₡20 000 y la barra de arriba seguía resumiendo los
    // ₡77 500 activos, o sea hablaba de filas que no estaban.
    if (filters.status === 'VOIDED') return []

    // Y `status: 'ACTIVE'` pisa el resto de los casos a propósito: un anulado aparece en la
    // tabla porque pasó, pero sumarlo inflaría su categoría con plata que volvió.
    //
    // El gasto es lo que se compone cuando el filtro no dice otra cosa. Una barra apilada
    // reparte un total entre partes, y el salario no es una parte del gasto: medido en
    // pantalla, con el filtro en «Gastos e ingresos» el sueldo se comía el setenta por ciento
    // de la barra y las ocho categorías de gasto quedaban en una tira al final.
    const rows = await this.prisma.client.movement.groupBy({
      by: ['categoryId', 'currency'],
      where: {
        ...this.whereOf(filters),
        status: 'ACTIVE',
        kind: filters.kind ?? 'EXPENSE',
      },
      _sum: { amountMinor: true },
    })

    return rows
      .filter((row) => row._sum.amountMinor !== null)
      .map((row) => ({
        categoryId: row.categoryId,
        total: Money.fromMinorUnits(row._sum.amountMinor!, row.currency as CurrencyCode),
      }))
  }

  async findByPaymentAccount(accountCode: string, range: DateRange): Promise<Movement[]> {
    const rows = await this.prisma.client.movement.findMany({
      where: {
        status: 'ACTIVE',
        paymentAccountCode: accountCode,
        date: { gte: range.from, lte: range.to },
      },
      orderBy: [{ date: 'asc' }, { id: 'asc' }],
    })
    return rows.map((row) => movementToDomain(row as MovementRow))
  }

  async findById(id: string): Promise<Movement | null> {
    const row = await this.prisma.client.movement.findUnique({ where: { id } })
    return row ? movementToDomain(row as MovementRow) : null
  }

  async save(movement: Movement): Promise<void> {
    const data = {
      date: movement.date,
      kind: movement.kind,
      categoryId: movement.categoryId,
      counterparty: movement.counterparty,
      amountMinor: movement.amount.minorUnits,
      currency: movement.amount.currency,
      paymentAccountCode: movement.paymentAccountCode,
      receiptKey: movement.receiptKey,
      status: movement.status,
    }
    await this.prisma.client.movement.upsert({
      where: { id: movement.id },
      create: { bookId: this.prisma.libro, id: movement.id, ...data },
      update: data,
    })
  }

  // Un movimiento anulado no cuenta: su falta de asiento es el estado esperado.
  async countUnposted(range: DateRange): Promise<number> {
    const candidates = await this.prisma.client.movement.findMany({
      where: { status: 'ACTIVE', date: { gte: range.from, lte: range.to } },
      select: { id: true },
    })
    if (candidates.length === 0) return 0

    const posted = await this.prisma.client.journalEntry.findMany({
      where: { sourceMovementId: { in: candidates.map((row) => row.id) } },
      select: { sourceMovementId: true },
    })
    const postedIds = new Set(posted.map((row) => row.sourceMovementId))

    return candidates.filter((row) => !postedIds.has(row.id)).length
  }

  async monthsWithMovements(): Promise<PeriodKey[]> {
    const rows = await this.prisma.client.movement.findMany({
      distinct: ['date'],
      select: { date: true },
      orderBy: { date: 'asc' },
    })
    return monthsOf(rows)
  }
}
