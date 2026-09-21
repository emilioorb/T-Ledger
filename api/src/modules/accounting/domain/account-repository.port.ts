import type { Account } from './account.js'
import type { ChartOfAccounts } from './chart-of-accounts.js'

export interface AccountRepository {
  loadChart(): Promise<ChartOfAccounts>
  findByCode(code: string): Promise<Account | null>
  save(account: Account): Promise<void>
  saveMany(accounts: readonly Account[]): Promise<void>
}

export const ACCOUNT_REPOSITORY = Symbol('ACCOUNT_REPOSITORY')
