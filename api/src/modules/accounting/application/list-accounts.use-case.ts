import { Inject, Injectable } from '@nestjs/common'
import { ACCOUNT_REPOSITORY, type AccountRepository } from '../domain/account-repository.port.js'
import type { Account } from '../domain/account.js'
import type { ListAccountsQuery } from '../infrastructure/accounting.schemas.js'

export interface AccountPage {
  readonly items: Account[]
  readonly totalItems: number
}

@Injectable()
export class ListAccountsUseCase {
  constructor(@Inject(ACCOUNT_REPOSITORY) private readonly accounts: AccountRepository) {}

  // El plan de cuentas es chico y se carga entero de todos modos para validar jerarquías:
  // pedirle a la base que filtre y pagine un árbol que ya está en memoria no ahorra nada.
  async execute(query: ListAccountsQuery): Promise<AccountPage> {
    const chart = await this.accounts.loadChart()
    const filtered = chart
      .all()
      .filter((account) => !query.accountClass || account.accountClass === query.accountClass)
      .filter((account) => query.active === undefined || account.active === query.active)
      .toSorted((a, b) => a.code.localeCompare(b.code))

    const from = (query.page - 1) * query.pageSize
    return { items: filtered.slice(from, from + query.pageSize), totalItems: filtered.length }
  }
}
