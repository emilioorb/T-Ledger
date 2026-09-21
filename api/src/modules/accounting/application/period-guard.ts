import { Inject, Injectable } from '@nestjs/common'
import { ConflictError } from '../../../shared/http/api-error.js'
import { PeriodKey } from '../domain/accounting-period.js'
import { PERIOD_REPOSITORY, type PeriodRepository } from '../domain/period-repository.port.js'

@Injectable()
export class PeriodGuard {
  constructor(@Inject(PERIOD_REPOSITORY) private readonly periods: PeriodRepository) {}

  // Todo camino que escriba un asiento pasa por acá: alta de movimiento, anulación,
  // asiento manual. Es el único lugar donde vive la regla, para que no se olvide en uno.
  // Vive en la capa de aplicación y no en el agregado porque saber si un período está
  // cerrado requiere ir al repositorio, y el dominio no habla con repositorios.
  async assertOpen(date: Date): Promise<void> {
    const key = PeriodKey.fromDate(date)
    const period = await this.periods.find(key)
    if (period?.isClosed()) {
      throw new ConflictError(`El período ${key.toString()} está cerrado y no acepta asientos.`)
    }
  }
}
