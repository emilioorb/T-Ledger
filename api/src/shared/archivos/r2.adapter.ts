import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { Injectable } from '@nestjs/common'
import type { Almacenamiento, ArchivoNuevo } from './almacenamiento.port.js'
import { enTandas } from './archivo.js'

export interface CredencialesDeR2 {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucket: string
}

// Cinco minutos. El enlace se pide cuando alguien va a mirar el comprobante, así que no hace
// falta que sobreviva a la pestaña; y cuanto menos dure, menos sirve si termina pegado en un
// chat por error.
const VIGENCIA = 5 * 60

// R2 habla el protocolo de S3, así que se usa su SDK. `region: 'auto'` lo pide el SDK y R2 lo
// ignora: no hay regiones que elegir.
@Injectable()
export class R2Adapter implements Almacenamiento {
  private readonly cliente: S3Client

  constructor(private readonly credenciales: CredencialesDeR2) {
    this.cliente = new S3Client({
      region: 'auto',
      endpoint: `https://${credenciales.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: credenciales.accessKeyId,
        secretAccessKey: credenciales.secretAccessKey,
      },
    })
  }

  async guardar({ clave, contenido, tipo }: ArchivoNuevo): Promise<void> {
    await this.cliente.send(
      new PutObjectCommand({
        Bucket: this.credenciales.bucket,
        Key: clave,
        Body: contenido,
        ContentType: tipo,
      }),
    )
  }

  async enlaceDeLectura(clave: string): Promise<string> {
    return getSignedUrl(
      this.cliente,
      new GetObjectCommand({ Bucket: this.credenciales.bucket, Key: clave }),
      { expiresIn: VIGENCIA },
    )
  }

  async borrar(clave: string): Promise<void> {
    await this.cliente.send(
      new DeleteObjectCommand({ Bucket: this.credenciales.bucket, Key: clave }),
    )
  }

  // Lista por páginas y borra en tandas de mil, que es lo que acepta R2 por llamada.
  // https://developers.cloudflare.com/r2/api/s3/api/
  async borrarTodoBajo(prefijo: string): Promise<void> {
    let continuacion: string | undefined
    do {
      const pagina = await this.cliente.send(
        new ListObjectsV2Command({
          Bucket: this.credenciales.bucket,
          Prefix: prefijo,
          ...(continuacion ? { ContinuationToken: continuacion } : {}),
        }),
      )
      const claves = (pagina.Contents ?? []).flatMap((objeto) => (objeto.Key ? [objeto.Key] : []))
      for (const tanda of enTandas(claves, 1000)) {
        await this.cliente.send(
          new DeleteObjectsCommand({
            Bucket: this.credenciales.bucket,
            Delete: { Objects: tanda.map((Key) => ({ Key })), Quiet: true },
          }),
        )
      }
      continuacion = pagina.IsTruncated ? pagina.NextContinuationToken : undefined
    } while (continuacion)
  }
}
