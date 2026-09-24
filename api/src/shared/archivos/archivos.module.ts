import { Global, Logger, Module } from '@nestjs/common'
import { loadArchivosEnv, type EnvDeArchivos } from '../config/env.js'
import { ALMACENAMIENTO } from './almacenamiento.port.js'
import { ArchivosController } from './archivos.controller.js'
import { DiscoAdapter } from './disco.adapter.js'
import { R2Adapter } from './r2.adapter.js'

// Dónde se guardan los comprobantes. R2 si están las cuatro credenciales, y el disco si no.
//
// La elección se hace acá y no en cada llamada: el resto de la aplicación pide `ALMACENAMIENTO`
// y no sabe cuál le tocó. Y se avisa al arrancar, porque «los archivos están en el disco de
// esta máquina» es algo que hay que saber antes de desplegar, no después.
export const almacenamientoDe = (env: EnvDeArchivos, registro = new Logger('Archivos')) => {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = env

  const credenciales = [R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET]
  if (credenciales.some(Boolean) && !credenciales.every(Boolean)) {
    throw new Error('R2 a medias: faltan credenciales. Cargá las cuatro o ninguna.')
  }

  if (R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET) {
    registro.log(`Comprobantes en R2, bucket ${R2_BUCKET}`)
    return new R2Adapter({
      accountId: R2_ACCOUNT_ID,
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
      bucket: R2_BUCKET,
    })
  }

  // El disco hay que pedirlo: en producción es el del contenedor, que se borra en cada
  // despliegue. Falla cerrado, así una variable que falta o dice «prod» no lo enciende.
  if (env.NODE_ENV !== 'development' && env.NODE_ENV !== 'test') {
    throw new Error('Sin R2 los comprobantes solo van al disco en desarrollo o tests (NODE_ENV).')
  }
  registro.warn(`Comprobantes en el disco (${env.ARCHIVOS_DIR}): falta configurar R2`)
  return new DiscoAdapter(env.ARCHIVOS_DIR)
}

@Global()
@Module({
  controllers: [ArchivosController],
  providers: [
    { provide: ALMACENAMIENTO, useFactory: () => almacenamientoDe(loadArchivosEnv(process.env)) },
  ],
  exports: [ALMACENAMIENTO],
})
export class ArchivosModule {}
