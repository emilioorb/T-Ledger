import { randomUUID } from 'node:crypto'
import { Inject, Injectable } from '@nestjs/common'
import { ALMACENAMIENTO, type Almacenamiento } from '../../../shared/archivos/almacenamiento.port.js'
import { borrarDelLibro, claveDeDocumentoDeDeuda, esDelLibro } from '../../../shared/archivos/archivo.js'
import { NotFoundError } from '../../../shared/http/api-error.js'
import { libroActual } from '../../../shared/libro/libro-context.js'
import { UNIT_OF_WORK, type UnitOfWork } from '../../../shared/prisma/unit-of-work.port.js'
import { RASTRO, type Rastro } from '../../auditoria/domain/rastro.port.js'
import type { Debt } from '../domain/debt.js'
import { DEBT_REPOSITORY, type DebtRepository } from '../domain/debt-repository.port.js'

export interface DocumentoNuevo {
  contenido: Buffer
  tipo: string
}

// El contrato de una deuda: subirlo, mirarlo y quitarlo. Sigue al comprobante de un movimiento
// punto por punto: el archivo antes que la fila, el anterior se borra al final sin cortar si
// falla, y el enlace se firma solo si la clave es del libro.
@Injectable()
export class DocumentoDeDeudaUseCase {
  constructor(
    @Inject(DEBT_REPOSITORY) private readonly debts: DebtRepository,
    @Inject(ALMACENAMIENTO) private readonly archivos: Almacenamiento,
    @Inject(UNIT_OF_WORK) private readonly transaction: UnitOfWork,
    @Inject(RASTRO) private readonly rastro: Rastro,
  ) {}

  async guardar(id: string, archivo: DocumentoNuevo): Promise<Debt> {
    const { bookId } = libroActual('guardar el documento de una deuda')
    const actual = await this.buscar(id)
    const clave = claveDeDocumentoDeDeuda(bookId, id, archivo.tipo, randomUUID().slice(0, 8))

    await this.archivos.guardar({ clave, contenido: archivo.contenido, tipo: archivo.tipo })
    const conDocumento = actual.withDocumentKey(clave)
    await this.registrar(actual, conDocumento)

    if (actual.documentKey) await borrarDelLibro(this.archivos, actual.documentKey, bookId).catch(() => undefined)
    return conDocumento
  }

  async enlace(id: string): Promise<string> {
    const { bookId } = libroActual('mirar el documento de una deuda')
    const clave = (await this.buscar(id)).documentKey
    if (!clave) throw new NotFoundError(`La deuda ${id} no tiene documento.`)
    if (!esDelLibro(clave, bookId)) throw new NotFoundError('Ese documento no es de este libro.')
    return this.archivos.enlaceDeLectura(clave)
  }

  async quitar(id: string): Promise<Debt> {
    const actual = await this.buscar(id)
    if (!actual.documentKey) return actual

    const sinDocumento = actual.withDocumentKey(null)
    await this.registrar(actual, sinDocumento)
    await borrarDelLibro(this.archivos, actual.documentKey, libroActual('quitar el documento de una deuda').bookId).catch(
      () => undefined,
    )
    return sinDocumento
  }

  private async buscar(id: string): Promise<Debt> {
    const debt = await this.debts.findById(id)
    if (!debt) throw new NotFoundError(`No existe una deuda con el id ${id}`)
    return debt
  }

  private registrar(antes: Debt, despues: Debt): Promise<void> {
    return this.transaction.withTransaction(async () => {
      await this.debts.update(despues)
      await this.rastro.registrar({
        entidad: 'deuda',
        entidadId: despues.id,
        accion: 'editar',
        antes: { documento: antes.documentKey },
        despues: { documento: despues.documentKey },
      })
    })
  }
}
