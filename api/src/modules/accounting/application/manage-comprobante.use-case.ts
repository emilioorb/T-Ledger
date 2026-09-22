import { randomUUID } from 'node:crypto'
import { Inject, Injectable } from '@nestjs/common'
import { ALMACENAMIENTO, type Almacenamiento } from '../../../shared/archivos/almacenamiento.port.js'
import { claveDeComprobante, esDelLibro } from '../../../shared/archivos/archivo.js'
import { NotFoundError, SemanticValidationError } from '../../../shared/http/api-error.js'
import { isErr } from '../../../shared/kernel/result.js'
import { libroActual } from '../../../shared/libro/libro-context.js'
import { UNIT_OF_WORK, type UnitOfWork } from '../../../shared/prisma/unit-of-work.port.js'
import { RASTRO, type Rastro } from '../../auditoria/domain/rastro.port.js'
import { MOVEMENT_REPOSITORY, type MovementRepository } from '../domain/movement-repository.port.js'
import { Movement } from '../domain/movement.js'

export interface ComprobanteNuevo {
  contenido: Buffer
  tipo: string
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

  async guardar(id: string, archivo: ComprobanteNuevo): Promise<Movement> {
    const { bookId } = libroActual('guardar un comprobante')
    const actual = await this.buscar(id)
    const props = actual.toProps()

    const clave = claveDeComprobante(bookId, id, archivo.tipo, randomUUID().slice(0, 8))

    // El archivo primero y la fila después: al revés, un fallo al subir dejaría un movimiento
    // apuntando a un comprobante que no existe, y la pantalla mostraría un enlace roto sin
    // explicar por qué.
    await this.archivos.guardar({ clave, contenido: archivo.contenido, tipo: archivo.tipo })

    const movement = Movement.create({ ...props, receiptKey: clave })
    if (isErr(movement)) throw new SemanticValidationError(movement.error.message)

    await this.transaction.withTransaction(async () => {
      await this.movements.save(movement.value)
      await this.rastro.registrar({
        entidad: 'movimiento',
        entidadId: id,
        accion: 'editar',
        antes: { comprobante: props.receiptKey },
        despues: { comprobante: clave },
      })
    })

    // El anterior se borra al final y sin cortar si falla: un archivo huérfano en el bucket
    // cuesta unos bytes; perder el nuevo porque no se pudo borrar el viejo cuesta la factura.
    if (props.receiptKey) await this.archivos.borrar(props.receiptKey).catch(() => undefined)

    return movement.value
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

  async quitar(id: string): Promise<Movement> {
    const actual = await this.buscar(id)
    const props = actual.toProps()
    if (!props.receiptKey) return actual

    const movement = Movement.create({ ...props, receiptKey: null })
    if (isErr(movement)) throw new SemanticValidationError(movement.error.message)

    await this.transaction.withTransaction(async () => {
      await this.movements.save(movement.value)
      await this.rastro.registrar({
        entidad: 'movimiento',
        entidadId: id,
        accion: 'editar',
        antes: { comprobante: props.receiptKey },
        despues: { comprobante: null },
      })
    })

    await this.archivos.borrar(props.receiptKey).catch(() => undefined)

    return movement.value
  }
}
