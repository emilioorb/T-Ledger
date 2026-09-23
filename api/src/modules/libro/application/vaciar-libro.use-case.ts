import { Inject, Injectable, Logger } from '@nestjs/common'
import { ALMACENAMIENTO, type Almacenamiento } from '../../../shared/archivos/almacenamiento.port.js'
import { prefijoDeComprobantes, prefijoDeDocumentosDeDeudas } from '../../../shared/archivos/archivo.js'
import { libroActual } from '../../../shared/libro/libro-context.js'
import { UNIT_OF_WORK, type UnitOfWork } from '../../../shared/prisma/unit-of-work.port.js'
import { RASTRO, type Rastro } from '../../auditoria/domain/rastro.port.js'
import { LIBRO_REPOSITORY, type LibroRepository } from '../domain/libro-repository.port.js'
import type { ResumenDeVaciado } from '../domain/vaciado.js'

@Injectable()
export class VaciarLibroUseCase {
  private readonly logger = new Logger(VaciarLibroUseCase.name)

  constructor(
    @Inject(LIBRO_REPOSITORY) private readonly libro: LibroRepository,
    @Inject(UNIT_OF_WORK) private readonly transaction: UnitOfWork,
    @Inject(RASTRO) private readonly rastro: Rastro,
    @Inject(ALMACENAMIENTO) private readonly archivos: Almacenamiento,
  ) {}

  // Todo junto o nada: un vaciado a medias deja asientos sin movimiento y saldos que no
  // cuadran contra nada. Y el rastro va dentro de la misma transacción, como manda el
  // ADR-004, con el detalle de lo que se llevó.
  async execute(): Promise<ResumenDeVaciado> {
    const { bookId } = libroActual('vaciar el libro')

    const resumen = await this.transaction.withTransaction(async () => {
      const vaciado = await this.libro.vaciar()

      await this.rastro.registrar({
        entidad: 'libro',
        entidadId: bookId,
        accion: 'vaciar',
        // Solo `antes`: después del vaciado no hay nada que describir, y lo que importa es
        // qué había. Es la misma forma que usa el registro para cualquier eliminación.
        antes: vaciado,
      })

      return vaciado
    })

    // Después del commit y sin cortar si falla, igual que al borrar un libro: el vaciado ya
    // ocurrió, y un archivo que quedó ocupa unos bytes. Sin esto, los comprobantes y contratos de
    // lo vaciado quedaban para siempre en el almacenamiento.
    await Promise.all(
      [prefijoDeComprobantes(bookId), prefijoDeDocumentosDeDeudas(bookId)].map((prefijo) =>
        this.archivos
          .borrarTodoBajo(prefijo)
          .catch((error: unknown) => this.logger.error(`No se pudieron borrar archivos del libro ${bookId}`, error)),
      ),
    )
    return resumen
  }
}
