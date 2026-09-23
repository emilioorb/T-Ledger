import { Inject, Injectable, Logger } from '@nestjs/common'
import { ALMACENAMIENTO, type Almacenamiento } from '../../../shared/archivos/almacenamiento.port.js'
import { NotFoundError } from '../../../shared/http/api-error.js'
import { UNIT_OF_WORK, type UnitOfWork } from '../../../shared/prisma/unit-of-work.port.js'
import { RASTRO, type Rastro } from '../../auditoria/domain/rastro.port.js'
import { DEBT_REPOSITORY, type DebtRepository } from '../domain/debt-repository.port.js'

@Injectable()
export class DeleteDebtUseCase {
  private readonly logger = new Logger(DeleteDebtUseCase.name)

  constructor(
    @Inject(DEBT_REPOSITORY) private readonly debts: DebtRepository,
    @Inject(UNIT_OF_WORK) private readonly transaction: UnitOfWork,
    @Inject(RASTRO) private readonly rastro: Rastro,
    @Inject(ALMACENAMIENTO) private readonly archivos: Almacenamiento,
  ) {}

  async execute(id: string): Promise<void> {
    // Se lee antes de borrar para que el rastro conserve qué deuda era: después del borrado ya
    // no hay a quién preguntarle, y «se eliminó algo» no le sirve a nadie.
    const deuda = await this.debts.findById(id)

    await this.transaction.withTransaction(async () => {
      const deleted = await this.debts.delete(id)
      if (!deleted) throw new NotFoundError(`No existe una deuda con el id ${id}`)
      await this.rastro.registrar({
        entidad: 'deuda',
        entidadId: id,
        accion: 'eliminar',
        ...(deuda ? { antes: deuda.toProps() } : {}),
      })
    })

    // El contrato vive fuera de la base y la cascada no lo alcanza. Después del borrado y sin
    // cortar si falla: la deuda ya no existe, y un archivo huérfano ocupa unos bytes.
    const contrato = deuda?.documentKey
    if (contrato) {
      await this.archivos
        .borrar(contrato)
        .catch((error: unknown) => this.logger.error(`No se pudo borrar el contrato de la deuda ${id}`, error))
    }
  }
}
