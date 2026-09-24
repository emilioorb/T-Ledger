import { Injectable } from '@nestjs/common'
import { SUBIR_VERSION, verificarEscritura } from '../../../shared/prisma/escribir-con-version.js'
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

  async add(debt: Debt): Promise<void> {
    const { id, ...rest } = toRow(debt)
    await this.prisma.client.debt.create({ data: { bookId: this.prisma.libro, id, ...rest } })
    await this.agregarPagos(debt, 0)
  }

  async update(debt: Debt): Promise<Debt> {
    const { id, ...rest } = toRow(debt)
    const { count } = await this.prisma.client.debt.updateMany({
      where: { id, version: debt.version },
      data: { ...rest, ...SUBIR_VERSION },
    })
    await verificarEscritura(count, async () => (await this.prisma.client.debt.count({ where: { id } })) > 0)
    await this.sincronizarPagos(debt)
    return debt.guardada()
  }

  // La versión ya garantizó que la fila está como se leyó, y los pagos van en orden y sin huecos
  // (el pago n es la cuota n): alcanza con comparar cuántos hay.
  private async sincronizarPagos(debt: Debt): Promise<void> {
    const guardados = await this.prisma.client.debtPayment.count({ where: { debtId: debt.id } })
    const cuantos = debt.payments.length
    if (guardados > cuantos) {
      await this.prisma.client.debtPayment.deleteMany({
        where: { debtId: debt.id, installmentNumber: { gt: cuantos } },
      })
    }
    if (cuantos > guardados) await this.agregarPagos(debt, guardados)
  }

  private async agregarPagos(debt: Debt, desde: number): Promise<void> {
    const nuevos = debt.payments.slice(desde)
    if (nuevos.length === 0) return
    await this.prisma.client.debtPayment.createMany({
      data: nuevos.map((payment) => ({
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
