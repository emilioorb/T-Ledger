import { Inject, Injectable } from '@nestjs/common'
import type { CurrencyCode } from '../../../shared/kernel/currency.js'
import { ACCOUNT_REPOSITORY, type AccountRepository } from '../domain/account-repository.port.js'
import { JOURNAL_REPOSITORY, type JournalRepository } from '../domain/journal-repository.port.js'
import { buildTree, ownBalances, rollUp, type ReportNode } from '../domain/reports/roll-up.js'

@Injectable()
export class GetAccountsTreeUseCase {
  constructor(
    @Inject(ACCOUNT_REPOSITORY) private readonly accounts: AccountRepository,
    @Inject(JOURNAL_REPOSITORY) private readonly journal: JournalRepository,
  ) {}

  // A diferencia de los reportes, acá no se poda nada: esto es el plan de cuentas con sus
  // saldos, y una cuenta sin movimiento sigue siendo parte del plan.
  async execute(currency: CurrencyCode, at: Date): Promise<ReportNode[]> {
    const [chart, totals] = await Promise.all([
      this.accounts.loadChart(),
      this.journal.totalsUpTo(currency, at),
    ])

    const accumulated = rollUp(chart, ownBalances(totals, chart, currency), currency)
    const every = new Set(chart.all().map((account) => account.code))

    return chart
      .roots()
      .map((root) => buildTree(chart, accumulated, every, root.code, currency))
      .filter((node): node is ReportNode => node !== null)
  }
}
