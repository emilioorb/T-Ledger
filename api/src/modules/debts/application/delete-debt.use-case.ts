import { Inject, Injectable, Logger } from '@nestjs/common'
import { ALMACENAMIENTO, type Almacenamiento } from '../../../shared/archivos/almacenamiento.port.js'
import { borrarDelLibro } from '../../../shared/archivos/archivo.js'
import { libroActual } from '../../../shared/libro/libro-context.js'
import { NotFoundError } from '../../../shared/http/api-error.js'
import { exigirVersion } from '../../../shared/prisma/escribir-con-version.js'
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

  async execute(id: string, version?: number): Promise<void> {
    // Se lee antes de borrar, y adentro del candado, para que el rastro conserve qué deuda era tal
    // como quedó: después del borrado ya no hay a quién preguntarle.
    const deuda = await this.transaction.withTransaction(async () => {
      const actual = await this.debts.findById(id)
      if (!actual) throw new NotFoundError(`No existe una deuda con el id ${id}`)
      exigirVersion(version, actual.version, 'borrar una deuda')
      await this.debts.delete(id)
      await this.rastro.registrar({ entidad: 'deuda', entidadId: id, accion: 'eliminar', antes: actual.toProps() })
      return actual
    })

    // El contrato vive fuera de la base y la cascada no lo alcanza. Después del borrado y sin
    // cortar si falla: la deuda ya no existe, y un archivo huérfano ocupa unos bytes.
    const contrato = deuda.documentKey
    if (contrato) {
      await borrarDelLibro(this.archivos, contrato, libroActual('borrar una deuda').bookId)
        .catch((error: unknown) => this.logger.error(`No se pudo borrar el contrato de la deuda ${id}`, error))
    }
  }
}
