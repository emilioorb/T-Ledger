import { Inject, Injectable } from '@nestjs/common'
import { libroActual } from '../../../shared/libro/libro-context.js'
import { UNIT_OF_WORK, type UnitOfWork } from '../../../shared/prisma/unit-of-work.port.js'
import { RASTRO, type Rastro } from '../../auditoria/domain/rastro.port.js'
import { LIBRO_REPOSITORY, type LibroRepository } from '../domain/libro-repository.port.js'
import type { ResumenDeVaciado } from '../domain/vaciado.js'

@Injectable()
export class VaciarLibroUseCase {
  constructor(
    @Inject(LIBRO_REPOSITORY) private readonly libro: LibroRepository,
    @Inject(UNIT_OF_WORK) private readonly transaction: UnitOfWork,
    @Inject(RASTRO) private readonly rastro: Rastro,
  ) {}

  // Todo junto o nada: un vaciado a medias deja asientos sin movimiento y saldos que no
  // cuadran contra nada. Y el rastro va dentro de la misma transacción, como manda el
  // ADR-004, con el detalle de lo que se llevó.
  async execute(): Promise<ResumenDeVaciado> {
    const { bookId } = libroActual('vaciar el libro')

    return this.transaction.withTransaction(async () => {
      const resumen = await this.libro.vaciar()

      await this.rastro.registrar({
        entidad: 'libro',
        entidadId: bookId,
        accion: 'vaciar',
        // Solo `antes`: después del vaciado no hay nada que describir, y lo que importa es
        // qué había. Es la misma forma que usa el registro para cualquier eliminación.
        antes: resumen,
      })

      return resumen
    })
  }
}
