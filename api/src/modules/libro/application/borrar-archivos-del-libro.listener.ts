import { Inject, Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { ALMACENAMIENTO, type Almacenamiento } from '../../../shared/archivos/almacenamiento.port.js'
import { prefijoDelLibro } from '../../../shared/archivos/archivo.js'
import { LIBRO_BORRADO, type LibroBorrado } from '../../identity/identity.tokens.js'

// Los comprobantes y los contratos viven en el almacenamiento, no en la base, así que la
// cascada que borra el libro no los alcanza: sin esto quedaban para siempre en el bucket, con
// facturas y contratos de alguien que ya no está.
//
// Mejor esfuerzo, a propósito: cuando esto corre el libro ya no existe. Si el almacenamiento
// falla, un archivo huérfano ocupa unos bytes; hacer fallar el borrado le diría a la persona
// que su libro sigue ahí, y no es cierto. El error queda en el log, con el id y no con datos.
@Injectable()
export class BorrarArchivosDelLibro {
  private readonly logger = new Logger(BorrarArchivosDelLibro.name)

  constructor(@Inject(ALMACENAMIENTO) private readonly archivos: Almacenamiento) {}

  @OnEvent(LIBRO_BORRADO)
  async manejar({ bookId }: LibroBorrado): Promise<void> {
    try {
      await this.archivos.borrarTodoBajo(prefijoDelLibro(bookId))
    } catch (error) {
      this.logger.error(`No se pudieron borrar los archivos del libro ${bookId}`, error)
    }
  }
}
