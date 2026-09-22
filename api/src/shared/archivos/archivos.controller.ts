import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { extname } from 'node:path'
import {
  Controller,
  Get,
  Header,
  Inject,
  NotFoundException,
  Param,
  StreamableFile,
} from '@nestjs/common'
import { libroActual } from '../libro/libro-context.js'
import { ALMACENAMIENTO, type Almacenamiento } from './almacenamiento.port.js'
import { esDelLibro, TIPOS_ACEPTADOS } from './archivo.js'
import { DiscoAdapter } from './disco.adapter.js'

const TIPO_POR_EXTENSION = Object.fromEntries(
  Object.entries(TIPOS_ACEPTADOS).map(([tipo, extension]) => [`.${extension}`, tipo]),
)

// Sirve los archivos cuando están en el disco, que es el caso mientras no haya credenciales
// de R2. Con R2 esta ruta no se usa: el enlace firmado apunta al bucket y el navegador va
// directo, sin pasar por acá.
//
// La comprobación de libro no es adorno. La clave viaja en la URL, así que sin esto bastaría
// cambiarle el identificador para leer la factura de otra familia desde una sesión propia.
@Controller('archivos')
export class ArchivosController {
  constructor(@Inject(ALMACENAMIENTO) private readonly archivos: Almacenamiento) {}

  @Get(':clave')
  // Privado y sin caché compartida: son facturas, con nombres y montos adentro.
  @Header('Cache-Control', 'private, max-age=60')
  async leer(@Param('clave') clave: string): Promise<StreamableFile> {
    if (!(this.archivos instanceof DiscoAdapter)) {
      throw new NotFoundException('Los archivos no se sirven desde acá.')
    }

    const { bookId } = libroActual('leer un archivo')
    if (!esDelLibro(clave, bookId)) throw new NotFoundException('Ese archivo no es de este libro.')

    const ruta = this.archivos.rutaLocalDe(clave)
    const existe = await stat(ruta).catch(() => null)
    if (!existe) throw new NotFoundException('Ese archivo ya no está.')

    return new StreamableFile(createReadStream(ruta), {
      type: TIPO_POR_EXTENSION[extname(ruta)] ?? 'application/octet-stream',
    })
  }
}
