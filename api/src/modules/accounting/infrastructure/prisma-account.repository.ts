import { Injectable } from '@nestjs/common'
import { unwrap } from '../../../shared/kernel/result.js'
import { PrismaService } from '../../../shared/prisma/prisma.service.js'
import type { AccountRepository } from '../domain/account-repository.port.js'
import type { Account } from '../domain/account.js'
import { ChartOfAccounts } from '../domain/chart-of-accounts.js'
import { accountToDomain, type AccountRow } from './accounting.mappers.js'

@Injectable()
export class PrismaAccountRepository implements AccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  // El árbol se valida al construirse: un plan incoherente en la base se detecta
  // al cargarlo, no al intentar asentar contra él.
  async loadChart(): Promise<ChartOfAccounts> {
    const rows = await this.prisma.client.account.findMany({ orderBy: { code: 'asc' } })
    return unwrap(ChartOfAccounts.create(rows.map((row) => accountToDomain(row as AccountRow))))
  }

  async findByCode(code: string): Promise<Account | null> {
    // `findFirst` y no `findUnique`: la clave es (bookId, code) y el libro lo completa la
    // extensión, así que pedirlo por clave compuesta acá solo repetiría lo que ya se sabe.
    const row = await this.prisma.client.account.findFirst({ where: { code } })
    return row ? accountToDomain(row as AccountRow) : null
  }

  async save(account: Account): Promise<void> {
    await this.saveMany([account])
  }

  async saveMany(accounts: readonly Account[]): Promise<void> {
    // Por niveles: una cuenta no se puede insertar antes que su madre, porque la
    // llave foránea del árbol apunta a ella.
    const ordered = [...accounts].sort((a, b) => {
      if (a.parentCode === null && b.parentCode !== null) return -1
      if (a.parentCode !== null && b.parentCode === null) return 1
      return a.code.localeCompare(b.code)
    })

    for (const account of ordered) {
      const data = {
        name: account.name,
        accountClass: account.accountClass,
        parentCode: account.parentCode,
        active: account.active,
        sortOrder: account.sortOrder,
        isCurrencyBridge: account.isCurrencyBridge,
      }
      await this.prisma.client.account.upsert({
        where: { bookId_code: { bookId: this.prisma.libro, code: account.code } },
        create: { bookId: this.prisma.libro, code: account.code, ...data },
        update: data,
      })
    }
  }
}
