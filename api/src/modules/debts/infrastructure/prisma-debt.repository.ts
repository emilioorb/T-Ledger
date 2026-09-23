import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../shared/prisma/prisma.service.js'
import type { Debt, DebtDirection } from '../domain/debt.js'
import type { DebtPage, DebtRepository } from '../domain/debt-repository.port.js'
import { toDomain, toRow, type DebtRow } from './debt.mapper.js'

// Los pagos viajan con la deuda: sin ellos el saldo no se puede calcular.
const conPagos = { payments: { orderBy: { installmentNumber: 'asc' as const } } }

@Injectable()
export class PrismaDebtRepository implements DebtRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page: number, pageSize: number, direction?: DebtDirection): Promise<DebtPage> {
    const where = direction ? { direction } : {}
    const [rows, totalItems] = await Promise.all([
      this.prisma.client.debt.findMany({
        where,
        include: conPagos,
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.client.debt.count({ where }),
    ])
    return { items: rows.map((row) => toDomain(row as DebtRow)), totalItems }
  }

  async findById(id: string): Promise<Debt | null> {
    const row = await this.prisma.client.debt.findUnique({ where: { id }, include: conPagos })
    return row ? toDomain(row as DebtRow) : null
  }

  async findByPaymentMovement(movementId: string): Promise<Debt | null> {
    const row = await this.prisma.client.debt.findFirst({
      where: { payments: { some: { movementId } } },
      include: conPagos,
    })
    return row ? toDomain(row as DebtRow) : null
  }

  async save(debt: Debt): Promise<void> {
    const row = toRow(debt)
    const { id, ...rest } = row
    await this.prisma.client.debt.upsert({
      where: { id },
      create: { bookId: this.prisma.libro, id, ...rest },
      update: rest,
    })
    await this.guardarPagos(debt)
  }

  // Se reemplazan enteros: son pocas filas por deuda, y así un pago deshecho desaparece sin
  // que el repositorio tenga que saber qué cambió.
  private async guardarPagos(debt: Debt): Promise<void> {
    await this.prisma.client.debtPayment.deleteMany({ where: { debtId: debt.id } })
    if (debt.payments.length === 0) return
    await this.prisma.client.debtPayment.createMany({
      data: debt.payments.map((payment) => ({
        bookId: this.prisma.libro,
        debtId: debt.id,
        installmentNumber: payment.installmentNumber,
        date: payment.date,
        movementId: payment.movementId,
      })),
    })
  }

  async delete(id: string): Promise<boolean> {
    const { count } = await this.prisma.client.debt.deleteMany({ where: { id } })
    return count > 0
  }
}
