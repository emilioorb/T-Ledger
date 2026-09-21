import { fromMoney } from '../../../shared/http/money.schema.js'
import type { BankAccount } from '../domain/bank-account.js'
import type { ParsedLine, StoredBankLine } from '../domain/bank-line.js'
import type { ImportProfile } from '../domain/import-profile.js'

const isoDate = (date: Date): string => date.toISOString().slice(0, 10)

export const toBankAccountResponse = (account: BankAccount) => ({
  id: account.id,
  name: account.name,
  accountCode: account.accountCode,
  currency: account.currency,
  profileId: account.profileId,
  active: account.active,
})

export const toImportProfileResponse = (profile: ImportProfile) => profile.toProps()

export const toParsedLineResponse = (line: ParsedLine) => ({
  date: isoDate(line.date),
  description: line.description,
  reference: line.reference,
  amount: fromMoney(line.amount),
})

export const toBankLineResponse = (line: StoredBankLine) => ({
  id: line.id,
  date: isoDate(line.date),
  description: line.description,
  reference: line.reference,
  amount: fromMoney(line.amount),
  status: line.status,
  movementId: line.movementId,
})
