import { Injectable } from '@nestjs/common'
import type { CurrencyCode } from '../../../shared/kernel/currency.js'
import { unwrap } from '../../../shared/kernel/result.js'
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
    }),
  )

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

  async save(account: BankAccount): Promise<void> {
    const data = {
      name: account.name,
      accountCode: account.accountCode,
      currency: account.currency,
      profileId: account.profileId,
      active: account.active,
    }
    await this.prisma.client.bankAccount.upsert({
      where: { id: account.id },
      create: { id: account.id, ...data },
      update: data,
    })
  }
}
