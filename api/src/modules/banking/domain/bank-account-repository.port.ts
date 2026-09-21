import type { BankAccount } from './bank-account.js'

export interface BankAccountRepository {
  findAll(): Promise<BankAccount[]>
  findById(id: string): Promise<BankAccount | null>
  save(account: BankAccount): Promise<void>
}

export const BANK_ACCOUNT_REPOSITORY = Symbol('BANK_ACCOUNT_REPOSITORY')
