import { Inject, Injectable } from '@nestjs/common'
import { SemanticValidationError } from '../../../shared/http/api-error.js'
import { AccountingPeriod, type PeriodKey } from '../domain/accounting-period.js'
import { blockersFor } from '../domain/period-closing.js'
import { PERIOD_REPOSITORY, type PeriodRepository } from '../domain/period-repository.port.js'
import { PeriodSnapshots } from './period-snapshots.js'

@Injectable()
export class ClosePeriodUseCase {
  constructor(
    @Inject(PERIOD_REPOSITORY) private readonly periods: PeriodRepository,
    private readonly snapshots: PeriodSnapshots,
  ) {}

  // Los bloqueos viajan completos en el error: la pantalla muestra todo lo que falta
  // y Emilio no los descubre de a uno.
  async execute(key: PeriodKey, at = new Date()): Promise<AccountingPeriod> {
    const blockers = blockersFor(await this.snapshots.of(key))
    if (blockers.length > 0) {
      throw new SemanticValidationError(
        `El período ${key.toString()} todavía no se puede cerrar.`,
        { blockers },
      )
    }

    const period = (await this.periods.find(key) ?? AccountingPeriod.open(key)).close(at)
    await this.periods.save(period)
    return period
  }
}
