import { Inject, Injectable } from '@nestjs/common'
import type { AccountingPeriod, PeriodKey } from '../domain/accounting-period.js'
import { PERIOD_REPOSITORY, type PeriodRepository } from '../domain/period-repository.port.js'

@Injectable()
export class ReopenPeriodUseCase {
  constructor(@Inject(PERIOD_REPOSITORY) private readonly periods: PeriodRepository) {}

  // Reabrir agosto dejando septiembre cerrado produciría un mes abierto debajo de uno
  // cerrado, que es justo lo que la regla del orden existe para impedir.
  async execute(key: PeriodKey): Promise<AccountingPeriod[]> {
    const [own, later] = await Promise.all([
      this.periods.find(key),
      this.periods.findClosedAfter(key),
    ])

    const closed = [...(own?.isClosed() ? [own] : []), ...later].sort((a, b) =>
      a.key.compareTo(b.key),
    )
    if (closed.length === 0) return []

    const reopened = closed.map((period) => period.reopen())
    await this.periods.saveMany(reopened)
    return reopened
  }
}
