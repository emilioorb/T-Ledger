import { Injectable } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { MOVIMIENTO_ANULANDOSE, type MovimientoAnulandose } from '../../accounting/accounting.events.js'
import { PagosDeDeudaUseCase } from './pagos-de-deuda.use-case.js'

// La deuda escucha a la contabilidad y no al revés: contabilidad no sabe que existen las deudas.
//
// `suppressErrors: false` es lo que hace que esto funcione: `@nestjs/event-emitter` se traga por
// defecto lo que tira un listener, y el 409 que frena anular el gasto de una cuota del medio se
// perdería en el log mientras el gasto quedaba anulado igual.
@Injectable()
export class DeshacerPagoAlAnular {
  constructor(private readonly pagos: PagosDeDeudaUseCase) {}

  @OnEvent(MOVIMIENTO_ANULANDOSE, { suppressErrors: false })
  async manejar({ movementId }: MovimientoAnulandose): Promise<void> {
    await this.pagos.alAnularSuGasto(movementId)
  }
}
