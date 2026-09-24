import type { BankAccount } from './bank-account.js'

export interface BankAccountRepository {
  findAll(): Promise<BankAccount[]>
  findById(id: string): Promise<BankAccount | null>
  add(account: BankAccount): Promise<void>
  // Solo si la fila sigue en la versión: si no, `EditadoPorOtroError`, o `NotFoundError` si ya no
  // existe. Devuelve lo guardado, en su versión nueva.
  update(account: BankAccount): Promise<BankAccount>
}

export const BANK_ACCOUNT_REPOSITORY = Symbol('BANK_ACCOUNT_REPOSITORY')
