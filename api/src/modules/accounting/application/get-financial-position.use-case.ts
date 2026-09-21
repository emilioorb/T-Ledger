import { Inject, Injectable } from '@nestjs/common'
import type { CurrencyCode } from '../../../shared/kernel/currency.js'
import { ACCOUNT_REPOSITORY, type AccountRepository } from '../domain/account-repository.port.js'
import { JOURNAL_REPOSITORY, type JournalRepository } from '../domain/journal-repository.port.js'
import {
  buildFinancialPosition,
  type FinancialPosition,
} from '../domain/reports/financial-position.js'

@Injectable()
export class GetFinancialPositionUseCase {
  constructor(
    @Inject(ACCOUNT_REPOSITORY) private readonly accounts: AccountRepository,
    @Inject(JOURNAL_REPOSITORY) private readonly journal: JournalRepository,
  ) {}

  // El estado de situación es una foto a una fecha, no un rango: pide el acumulado
  // de toda la historia hasta ese día.
  async execute(at: Date, currency: CurrencyCode): Promise<FinancialPosition> {
    const [chart, totals] = await Promise.all([
      this.accounts.loadChart(),
      this.journal.totalsUpTo(currency, at),
    ])
    return buildFinancialPosition(totals, chart, currency)
  }
}
