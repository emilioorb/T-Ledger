import { randomUUID } from 'node:crypto'
import { Inject, Injectable } from '@nestjs/common'
import { ALMACENAMIENTO, type Almacenamiento } from '../../../shared/archivos/almacenamiento.port.js'
import { borrarDelLibro, claveDeDocumentoDeDeuda, esDelLibro } from '../../../shared/archivos/archivo.js'
import { EditadoPorOtroError, NotFoundError } from '../../../shared/http/api-error.js'
import { libroActual } from '../../../shared/libro/libro-context.js'
import { exigirVersion } from '../../../shared/prisma/escribir-con-version.js'
import { UNIT_OF_WORK, type UnitOfWork } from '../../../shared/prisma/unit-of-work.port.js'
import { RASTRO, type Rastro } from '../../auditoria/domain/rastro.port.js'
import type { Debt } from '../domain/debt.js'
import { DEBT_REPOSITORY, type DebtRepository } from '../domain/debt-repository.port.js'

export interface DocumentoNuevo {
  contenido: Buffer
  tipo: string
}

interface CambioDeDocumento {
  debt: Debt
  // El documento que dejó de usarse, para borrarlo cuando la fila ya se guardó.
  anterior: string | null
}

// El contrato de una deuda: subirlo, mirarlo y quitarlo. Sigue al comprobante de un movimiento
// punto por punto: el archivo se sube afuera de la transacción y la fila se relee adentro, el
// archivo nuevo se borra si la fila no se guardó, el anterior al final, y el enlace se firma
// solo si la clave es del libro. Solo lo llama el controller: dentro de una transacción de
// afuera, «después de guardar» no sería el commit de verdad.
@Injectable()
export class DocumentoDeDeudaUseCase {
  constructor(
    @Inject(DEBT_REPOSITORY) private readonly debts: DebtRepository,
    @Inject(ALMACENAMIENTO) private readonly archivos: Almacenamiento,
    @Inject(UNIT_OF_WORK) private readonly transaction: UnitOfWork,
    @Inject(RASTRO) private readonly rastro: Rastro,
  ) {}

  async guardar(id: string, archivo: DocumentoNuevo, version?: number): Promise<Debt> {
    const { bookId } = libroActual('guardar el documento de una deuda')
    // Corte temprano, sin candado, para no subir veinte megas que van a terminar en un 409.
    const previa = await this.buscar(id)
    if (version !== undefined && version !== previa.version) throw new EditadoPorOtroError()

    const clave = claveDeDocumentoDeDeuda(bookId, id, archivo.tipo, randomUUID().slice(0, 8))
    await this.archivos.guardar({ clave, contenido: archivo.contenido, tipo: archivo.tipo })

    const cambio = await this.transaction
      .withTransaction(() => this.apuntar(id, clave, version))
      .catch(async (error: unknown) => {
        await this.borrarSiNadieLoUsa(id, clave, bookId)
        throw error
      })
    await this.borrarAnterior(cambio.anterior, bookId)
    return cambio.debt
  }

  async enlace(id: string): Promise<string> {
    const { bookId } = libroActual('mirar el documento de una deuda')
    const clave = (await this.buscar(id)).documentKey
    if (!clave) throw new NotFoundError(`La deuda ${id} no tiene documento.`)
    if (!esDelLibro(clave, bookId)) throw new NotFoundError('Ese documento no es de este libro.')
    return this.archivos.enlaceDeLectura(clave)
  }

  async quitar(id: string, version?: number): Promise<Debt> {
    const { bookId } = libroActual('quitar el documento de una deuda')
    const cambio = await this.transaction.withTransaction(() => this.apuntar(id, null, version))
    await this.borrarAnterior(cambio.anterior, bookId)
    return cambio.debt
  }

  private async buscar(id: string): Promise<Debt> {
    const debt = await this.debts.findById(id)
    if (!debt) throw new NotFoundError(`No existe una deuda con el id ${id}`)
    return debt
  }

  private async apuntar(id: string, clave: string | null, version: number | undefined): Promise<CambioDeDocumento> {
    const actual = await this.buscar(id)
    const anterior = actual.documentKey
    if (anterior === clave) return { debt: actual, anterior: null }
    exigirVersion(version, actual.version, 'cambiar el documento de una deuda')

    const guardada = await this.debts.update(actual.withDocumentKey(clave))
    await this.rastro.registrar({
      entidad: 'deuda',
      entidadId: id,
      accion: 'editar',
      antes: { documento: anterior },
      despues: { documento: clave },
    })
    return { debt: guardada, anterior }
  }

  // Si la fila no se guardó, el archivo nuevo no lo usa nadie. Se relee antes de borrar: un corte
  // justo en el COMMIT tira error aunque la fila haya quedado guardada.
  private async borrarSiNadieLoUsa(id: string, clave: string, bookId: string): Promise<void> {
    // Sin poder releer no se sabe: un archivo huérfano cuesta menos que una fila apuntando a nada.
    const enUso = await this.debts.findById(id).then(
      (fila) => fila?.documentKey === clave,
      () => true,
    )
    if (enUso) return
    await borrarDelLibro(this.archivos, clave, bookId).catch(() => undefined)
  }

  // Al final y sin cortar si falla: un archivo huérfano cuesta unos bytes.
  private async borrarAnterior(clave: string | null, bookId: string): Promise<void> {
    if (clave) await borrarDelLibro(this.archivos, clave, bookId).catch(() => undefined)
  }
}
