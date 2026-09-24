import { Injectable } from '@nestjs/common'
import type { CurrencyCode } from '../../../shared/kernel/currency.js'
import { unwrap } from '../../../shared/kernel/result.js'
import { SUBIR_VERSION, verificarEscritura } from '../../../shared/prisma/escribir-con-version.js'
import { PrismaService } from '../../../shared/prisma/prisma.service.js'
import { BankAccount } from '../domain/bank-account.js'
import type { BankAccountRepository } from '../domain/bank-account-repository.port.js'

interface BankAccountRow {
  id: string
  name: string
  accountCode: string
  currency: string
  profileId: string | null
  active: boolean
  version: number
}

const toDomain = (row: BankAccountRow): BankAccount =>
  unwrap(
    BankAccount.create({
      id: row.id,
      name: row.name,
      accountCode: row.accountCode,
      currency: row.currency as CurrencyCode,
      profileId: row.profileId,
      active: row.active,
      version: row.version,
    }),
  )

const datosDe = (account: BankAccount) => ({
  name: account.name,
  accountCode: account.accountCode,
  currency: account.currency,
  profileId: account.profileId,
  active: account.active,
})

@Injectable()
export class PrismaBankAccountRepository implements BankAccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<BankAccount[]> {
    const rows = await this.prisma.client.bankAccount.findMany({ orderBy: { createdAt: 'asc' } })
    return rows.map((row) => toDomain(row as BankAccountRow))
  }

  async findById(id: string): Promise<BankAccount | null> {
    const row = await this.prisma.client.bankAccount.findUnique({ where: { id } })
    return row ? toDomain(row as BankAccountRow) : null
  }

  async add(account: BankAccount): Promise<void> {
    await this.prisma.client.bankAccount.create({
      data: { bookId: this.prisma.libro, id: account.id, ...datosDe(account) },
    })
  }

  async update(account: BankAccount): Promise<BankAccount> {
    const { count } = await this.prisma.client.bankAccount.updateMany({
      where: { id: account.id, version: account.version },
      data: { ...datosDe(account), ...SUBIR_VERSION },
    })
    await verificarEscritura(count, async () => (await this.prisma.client.bankAccount.count({ where: { id: account.id } })) > 0)
    return account.guardada()
  }
}
