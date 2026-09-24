import { randomUUID } from 'node:crypto'
import { Inject, Injectable } from '@nestjs/common'
import { ALMACENAMIENTO, type Almacenamiento } from '../../../shared/archivos/almacenamiento.port.js'
import { borrarDelLibro, claveDeComprobante, esDelLibro } from '../../../shared/archivos/archivo.js'
import { NotFoundError, SemanticValidationError } from '../../../shared/http/api-error.js'
import { isErr } from '../../../shared/kernel/result.js'
import { libroActual } from '../../../shared/libro/libro-context.js'
import { exigirVersion } from '../../../shared/prisma/escribir-con-version.js'
import { UNIT_OF_WORK, type UnitOfWork } from '../../../shared/prisma/unit-of-work.port.js'
import { RASTRO, type Rastro } from '../../auditoria/domain/rastro.port.js'
import { MOVEMENT_REPOSITORY, type MovementRepository } from '../domain/movement-repository.port.js'
import { Movement } from '../domain/movement.js'

export interface ComprobanteNuevo {
  contenido: Buffer
  tipo: string
}

interface CambioDeComprobante {
  movement: Movement
  // El comprobante que dejó de usarse, para borrarlo cuando la fila ya se guardó.
  anterior: string | null
}

// El comprobante de un movimiento: subirlo, mirarlo y quitarlo.
//
// Va aparte de editar el movimiento porque no cambia la contabilidad: adjuntar la foto de una
// factura no revierte el asiento ni emite uno nuevo, y meterlo en `update` habría hecho
// exactamente eso por cada archivo que alguien suba.
@Injectable()
export class ManageComprobanteUseCase {
  constructor(
    @Inject(MOVEMENT_REPOSITORY) private readonly movements: MovementRepository,
    @Inject(ALMACENAMIENTO) private readonly archivos: Almacenamiento,
    @Inject(UNIT_OF_WORK) private readonly transaction: UnitOfWork,
    @Inject(RASTRO) private readonly rastro: Rastro,
  ) {}

  private async buscar(id: string): Promise<Movement> {
    const movement = await this.movements.findById(id)
    if (!movement) throw new NotFoundError(`El movimiento ${id} no existe.`)
    return movement
  }

  // El archivo se sube afuera de la transacción: subir tarda lo que tarde la red, y el candado del
  // libro no se retiene esperándola. Adentro, la fila se relee: armada con lo leído antes de subir,
  // una anulación que entrara en el medio volvía el movimiento a activo.
  async guardar(id: string, archivo: ComprobanteNuevo, version?: number): Promise<Movement> {
    const { bookId } = libroActual('guardar un comprobante')
    await this.buscar(id)

    const clave = claveDeComprobante(bookId, id, archivo.tipo, randomUUID().slice(0, 8))
    // El archivo primero y la fila después: al revés, un fallo al subir dejaría un movimiento
    // apuntando a un comprobante que no existe, y la pantalla mostraría un enlace roto sin
    // explicar por qué.
    await this.archivos.guardar({ clave, contenido: archivo.contenido, tipo: archivo.tipo })

    const cambio = await this.transaction
      .withTransaction(() => this.apuntar(id, clave, version))
      .catch(async (error: unknown) => {
        // Si la fila no se guardó, el archivo nuevo no lo va a usar nadie.
        await borrarDelLibro(this.archivos, clave, bookId).catch(() => undefined)
        throw error
      })

    await this.borrarAnterior(cambio.anterior, bookId)
    return cambio.movement
  }

  async enlace(id: string): Promise<string> {
    const { bookId } = libroActual('mirar un comprobante')
    const movement = await this.buscar(id)
    const clave = movement.receiptKey

    if (!clave) throw new NotFoundError(`El movimiento ${id} no tiene comprobante.`)
    // El movimiento ya vino filtrado por libro, así que esto no debería fallar nunca. Está
    // igual: es lo único que impide firmar el enlace de un archivo ajeno si alguna vez una
    // clave termina guardada donde no va.
    if (!esDelLibro(clave, bookId)) throw new NotFoundError('Ese comprobante no es de este libro.')

    return this.archivos.enlaceDeLectura(clave)
  }

  async quitar(id: string, version?: number): Promise<Movement> {
    const { bookId } = libroActual('quitar un comprobante')
    const cambio = await this.transaction.withTransaction(() => this.apuntar(id, null, version))
    await this.borrarAnterior(cambio.anterior, bookId)
    return cambio.movement
  }

  private async apuntar(id: string, clave: string | null, version: number | undefined): Promise<CambioDeComprobante> {
    const actual = await this.buscar(id)
    const anterior = actual.receiptKey
    if (anterior === clave) return { movement: actual, anterior: null }
    exigirVersion(version, actual.version, 'cambiar el comprobante de un movimiento')

    const movement = Movement.create({ ...actual.toProps(), receiptKey: clave })
    if (isErr(movement)) throw new SemanticValidationError(movement.error.message)

    const guardado = await this.movements.update(movement.value)
    await this.rastro.registrar({
      entidad: 'movimiento',
      entidadId: id,
      accion: 'editar',
      antes: { comprobante: anterior },
      despues: { comprobante: clave },
    })
    return { movement: guardado, anterior }
  }

  // Al final y sin cortar si falla: un archivo huérfano en el bucket cuesta unos bytes; perder el
  // cambio porque no se pudo borrar el viejo cuesta la factura.
  private async borrarAnterior(clave: string | null, bookId: string): Promise<void> {
    if (clave) await borrarDelLibro(this.archivos, clave, bookId).catch(() => undefined)
  }
}
