import { Inject, Injectable } from '@nestjs/common'
import { CURRENCIES } from '../../../shared/kernel/currency.js'
import type { PeriodKey } from '../domain/accounting-period.js'
import { ACCOUNT_REPOSITORY, type AccountRepository } from '../domain/account-repository.port.js'
import { JOURNAL_REPOSITORY, type JournalRepository } from '../domain/journal-repository.port.js'
import { MOVEMENT_REPOSITORY, type MovementRepository } from '../domain/movement-repository.port.js'
import { PERIOD_REPOSITORY, type PeriodRepository } from '../domain/period-repository.port.js'
import type { PeriodSnapshot } from '../domain/period-closing.js'
import { buildTrialBalance } from '../domain/reports/trial-balance.js'

const ONE_ROW = 1

@Injectable()
export class PeriodSnapshots {
  constructor(
    @Inject(ACCOUNT_REPOSITORY) private readonly accounts: AccountRepository,
    @Inject(JOURNAL_REPOSITORY) private readonly journal: JournalRepository,
    @Inject(MOVEMENT_REPOSITORY) private readonly movements: MovementRepository,
    @Inject(PERIOD_REPOSITORY) private readonly periods: PeriodRepository,
  ) {}

  // La foto que el cierre necesita para decidir. Vive acá y no en el dominio porque
  // armarla es ir a cuatro repositorios; qué hacer con ella sí es del dominio.
  async of(key: PeriodKey): Promise<PeriodSnapshot> {
    const range = key.range()

    const [period, page, unpostedMovementCount, trialBalanceBalances, previousClosed] =
      await Promise.all([
        this.periods.find(key),
        this.journal.findInRange(range, 1, ONE_ROW),
        this.movements.countUnposted(range),
        this.balancesInEveryCurrency(key),
        this.previousClosed(key),
      ])

    return {
      key,
      status: period?.status ?? 'OPEN',
      entryCount: page.totalItems,
      unpostedMovementCount,
      trialBalanceBalances,
      previousClosed,
    }
  }

  // La invariante es por moneda: un mes cuadra solo si cuadra en todas.
  private async balancesInEveryCurrency(key: PeriodKey): Promise<boolean> {
    const chart = await this.accounts.loadChart()
    const range = key.range()

    const balances = await Promise.all(
      CURRENCIES.map(async (currency) =>
        buildTrialBalance(await this.journal.totalsByAccount(currency, range), chart, currency)
          .balances,
      ),
    )

    return balances.every(Boolean)
  }

  // El primer mes de la historia no tiene un anterior que cerrar: exigirlo dejaría el
  // libro sin forma de arrancar.
  private async previousClosed(key: PeriodKey): Promise<boolean> {
    const previous = key.previous()
    const stored = await this.periods.find(previous)
    if (stored?.isClosed()) return true

    const history = await Promise.all(
      CURRENCIES.map((currency) => this.journal.totalsUpTo(currency, previous.range().to)),
    )

    return history.every((totals) => totals.length === 0)
  }
}
