import { mkdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { Injectable } from '@nestjs/common'
import type { Almacenamiento, ArchivoNuevo } from './almacenamiento.port.js'

// El almacenamiento de cuando no hay credenciales de R2: el disco de la máquina que corre la
// API. Existe para que subir un comprobante funcione hoy, sin cuenta de Cloudflare, y para
// que los tests no dependan de la red.
//
// No es para producción y no lo disimula: los archivos viven junto al proceso, así que un
// despliegue nuevo se los lleva. Por eso el arranque avisa cuál de los dos está usando.
@Injectable()
export class DiscoAdapter implements Almacenamiento {
  constructor(private readonly raiz: string) {}

  private rutaDe(clave: string): string {
    // `resolve` y comprobación: una clave con `..` podría escribir fuera de la carpeta. Las
    // claves las arma el servidor, pero esto es lo que hace que siga siendo cierto el día que
    // alguien construya una desde la petición.
    const ruta = resolve(join(this.raiz, clave))
    if (!ruta.startsWith(resolve(this.raiz))) throw new Error(`Clave fuera de lugar: ${clave}`)
    return ruta
  }

  async guardar({ clave, contenido }: ArchivoNuevo): Promise<void> {
    const ruta = this.rutaDe(clave)
    await mkdir(dirname(ruta), { recursive: true })
    await writeFile(ruta, contenido)
  }

  // Sin firma ni vencimiento: lo sirve la propia API, que ya comprobó la sesión y el libro
  // antes de llegar acá. La ruta es la del endpoint que lee el archivo.
  async enlaceDeLectura(clave: string): Promise<string> {
    return `/api/v1/archivos/${encodeURIComponent(clave)}`
  }

  async borrar(clave: string): Promise<void> {
    await rm(this.rutaDe(clave), { force: true })
  }

  async borrarTodoBajo(prefijo: string): Promise<void> {
    await rm(this.rutaDe(prefijo), { recursive: true, force: true })
  }

  rutaLocalDe(clave: string): string {
    return this.rutaDe(clave)
  }
}
