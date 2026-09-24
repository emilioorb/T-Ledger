import { Inject, Injectable } from '@nestjs/common'
import { SemanticValidationError } from '../../../shared/http/api-error.js'
import { AccountingPeriod, type PeriodKey } from '../domain/accounting-period.js'
import { blockersFor } from '../domain/period-closing.js'
import { UNIT_OF_WORK, type UnitOfWork } from '../../../shared/prisma/unit-of-work.port.js'
import { RASTRO, type Rastro } from '../../auditoria/domain/rastro.port.js'
import { PERIOD_REPOSITORY, type PeriodRepository } from '../domain/period-repository.port.js'
import { PeriodSnapshots } from './period-snapshots.js'

@Injectable()
export class ClosePeriodUseCase {
  constructor(
    @Inject(PERIOD_REPOSITORY) private readonly periods: PeriodRepository,
    private readonly snapshots: PeriodSnapshots,
    @Inject(UNIT_OF_WORK) private readonly transaction: UnitOfWork,
    @Inject(RASTRO) private readonly rastro: Rastro,
  ) {}

  // Los bloqueos viajan completos en el error: la pantalla muestra todo lo que falta
  // y Emilio no los descubre de a uno.
  //
  // Todo adentro del candado del libro: calculados afuera, un movimiento que entraba entre la
  // foto y el guardado quedaba adentro de un mes cerrado, que es lo que los bloqueos impiden
  // (ADR-006).
  execute(key: PeriodKey, at?: Date): Promise<AccountingPeriod> {
    return this.transaction.withTransaction(() => this.cerrar(key, at ?? new Date()))
  }

  private async cerrar(key: PeriodKey, at: Date): Promise<AccountingPeriod> {
    const blockers = blockersFor(await this.snapshots.of(key))
    if (blockers.length > 0) {
      throw new SemanticValidationError(
        `El período ${key.toString()} todavía no se puede cerrar.`,
        { blockers },
      )
    }

    const period = ((await this.periods.find(key)) ?? AccountingPeriod.open(key)).close(at)

    // El rastro cae con el cierre o no cae: un mes cerrado sin saber quién lo cerró es
    // exactamente la discusión que este registro viene a evitar.
    await this.periods.save(period)
    await this.rastro.registrar({
      entidad: 'periodo',
      entidadId: key.toString(),
      accion: 'cerrar',
    })
    return period
  }
}
