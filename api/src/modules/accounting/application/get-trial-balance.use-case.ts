import { Inject, Injectable } from '@nestjs/common'
import type { CurrencyCode } from '../../../shared/kernel/currency.js'
import type { DateRange } from '../../../shared/kernel/date-range.js'
import { ACCOUNT_REPOSITORY, type AccountRepository } from '../domain/account-repository.port.js'
import { JOURNAL_REPOSITORY, type JournalRepository } from '../domain/journal-repository.port.js'
import { buildTrialBalance, type TrialBalance } from '../domain/reports/trial-balance.js'

@Injectable()
export class GetTrialBalanceUseCase {
  constructor(
    @Inject(ACCOUNT_REPOSITORY) private readonly accounts: AccountRepository,
    @Inject(JOURNAL_REPOSITORY) private readonly journal: JournalRepository,
  ) {}

  async execute(range: DateRange, currency: CurrencyCode): Promise<TrialBalance> {
    const [chart, totals] = await Promise.all([
      this.accounts.loadChart(),
      this.journal.totalsByAccount(currency, range),
    ])
    return buildTrialBalance(totals, chart, currency)
  }
}
