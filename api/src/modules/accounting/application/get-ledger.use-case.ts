import { Inject, Injectable } from '@nestjs/common'
import { NotFoundError } from '../../../shared/http/api-error.js'
import type { CurrencyCode } from '../../../shared/kernel/currency.js'
import type { DateRange } from '../../../shared/kernel/date-range.js'
import { ACCOUNT_REPOSITORY, type AccountRepository } from '../domain/account-repository.port.js'
import { JOURNAL_REPOSITORY, type JournalRepository } from '../domain/journal-repository.port.js'
import { buildLedger, type GeneralLedger } from '../domain/reports/general-ledger.js'

@Injectable()
export class GetLedgerUseCase {
  constructor(
    @Inject(ACCOUNT_REPOSITORY) private readonly accounts: AccountRepository,
    @Inject(JOURNAL_REPOSITORY) private readonly journal: JournalRepository,
  ) {}

  async execute(
    accountCode: string,
    currency: CurrencyCode,
    range: DateRange,
  ): Promise<GeneralLedger> {
    const account = await this.accounts.findByCode(accountCode)
    if (!account) throw new NotFoundError(`La cuenta ${accountCode} no existe en el plan.`)

    const [opening, entries] = await Promise.all([
      this.journal.openingBalanceFor(accountCode, currency, range.from),
      this.journal.ledgerFor(accountCode, currency, range),
    ])

    return buildLedger(opening, entries, accountCode, currency, account.accountClass)
  }
}
