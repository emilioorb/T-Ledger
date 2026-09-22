import { Inject, Injectable } from '@nestjs/common'
import type { AccountingPeriod, PeriodKey } from '../domain/accounting-period.js'
import { UNIT_OF_WORK, type UnitOfWork } from '../../../shared/prisma/unit-of-work.port.js'
import { RASTRO, type Rastro } from '../../auditoria/domain/rastro.port.js'
import { PERIOD_REPOSITORY, type PeriodRepository } from '../domain/period-repository.port.js'

@Injectable()
export class ReopenPeriodUseCase {
  constructor(
    @Inject(PERIOD_REPOSITORY) private readonly periods: PeriodRepository,
    @Inject(UNIT_OF_WORK) private readonly transaction: UnitOfWork,
    @Inject(RASTRO) private readonly rastro: Rastro,
  ) {}

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

    // Un rastro por mes reabierto y no uno solo por la operación: reabrir agosto arrastra
    // septiembre y octubre, y dentro de un mes la pregunta es siempre «¿quién reabrió *este*?».
    await this.transaction.withTransaction(async () => {
      await this.periods.saveMany(reopened)
      for (const period of reopened) {
        await this.rastro.registrar({
          entidad: 'periodo',
          entidadId: period.key.toString(),
          accion: 'reabrir',
        })
      }
    })

    return reopened
  }
}
