import type { Almacenamiento } from './almacenamiento.port.js'

// Qué se acepta como comprobante y cómo se nombra una vez guardado.
//
// Las reglas viven acá, puras, y no adentro del adaptador de turno: son las mismas contra R2
// que contra el disco, y son lo que hay que poder probar sin red ni credenciales.

// Lo que una factura puede ser: una foto, una captura o un PDF. La lista es cerrada porque el
// tipo que llega en la petición lo pone quien sube, y aceptar cualquiera sería guardar lo que
// alguien quiera en un bucket con nuestro nombre.
export const TIPOS_ACEPTADOS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'application/pdf': 'pdf',
}

// Cinco megas. Una foto de una factura sacada con el teléfono pesa uno o dos; de ahí para
// arriba es alguien subiendo otra cosa.
export const TAMANO_MAXIMO = 5 * 1024 * 1024

// Veinte para los documentos de una deuda: un contrato escaneado de varias hojas pasa con
// facilidad de los cinco megas de una foto.
export const TAMANO_MAXIMO_DOCUMENTO = 20 * 1024 * 1024

export type RechazoDeArchivo = 'tipo' | 'tamano' | 'vacio'

export const revisar = (
  archivo: { mimetype: string; size: number },
  tope: number = TAMANO_MAXIMO,
): RechazoDeArchivo | null => {
  if (archivo.size === 0) return 'vacio'
  if (archivo.size > tope) return 'tamano'
  if (!(archivo.mimetype in TIPOS_ACEPTADOS)) return 'tipo'
  return null
}

// La clave con la que el archivo vive en el bucket. Lleva el libro adelante por dos razones:
// se puede borrar un libro entero con un prefijo, y un objeto suelto dice a quién pertenece
// sin consultar la base.
//
// El nombre original no se usa. «factura.pdf» repetido cien veces se pisa a sí mismo, y el
// nombre que alguien le puso a un archivo en su computadora puede traer cualquier cosa
// adentro —barras, dos puntos, `..`— que en una clave de objeto significan otra cosa.
export const claveDeComprobante = (
  bookId: string,
  movementId: string,
  mimetype: string,
  azar: string,
): string => `${prefijoDeComprobantes(bookId)}${movementId}-${azar}.${TIPOS_ACEPTADOS[mimetype]}`

// El contrato o cualquier documento de una deuda. Misma regla que el comprobante: el libro
// adelante y un nombre que no viene de quien sube.
export const claveDeDocumentoDeDeuda = (
  bookId: string,
  debtId: string,
  mimetype: string,
  azar: string,
): string => `${prefijoDeDocumentosDeDeudas(bookId)}${debtId}-${azar}.${TIPOS_ACEPTADOS[mimetype]}`

// Todo lo de un libro, para borrarlo junto con él. Lo que devuelve se le pasa a un borrado
// masivo, así que se niega a armar algo que no sea exactamente la carpeta de un libro: un id
// vacío daría `libros//` y uno con barras o `..` apuntaría a otra cosa. Un error acá vaciaría
// el bucket de todos.
export const prefijoDelLibro = (bookId: string): string => {
  if (!/^[A-Za-z0-9_-]+$/.test(bookId)) throw new Error(`Id de libro inválido para un prefijo: «${bookId}»`)
  return `libros/${bookId}/`
}

// Las carpetas de lo que se va al vaciar un libro: vaciar borra todos los movimientos y todas
// las deudas, así que sus comprobantes y contratos se van enteros. Heredan la guardia del libro.
export const prefijoDeComprobantes = (bookId: string): string =>
  `${prefijoDelLibro(bookId)}comprobantes/`

export const prefijoDeDocumentosDeDeudas = (bookId: string): string =>
  `${prefijoDelLibro(bookId)}documentos/deudas/`

// Borrar en R2 acepta hasta mil claves por llamada.
export const enTandas = <T>(elementos: readonly T[], tamano: number): T[][] =>
  Array.from({ length: Math.ceil(elementos.length / tamano) }, (_, i) =>
    elementos.slice(i * tamano, (i + 1) * tamano),
  )

const EXTENSIONES = Object.values(TIPOS_ACEPTADOS).join('|')

// La forma exacta de las claves que arma el servidor: libro, carpeta conocida y un nombre sin
// barras ni puntos de más. Nada de prefijos: `libros/<propio>/../<otro>/…` empieza bien y el
// disco resuelve el `..` hacia la factura de otra familia.
const FORMA_DE_CLAVE = new RegExp(
  `^libros/(?<libro>[A-Za-z0-9_-]+)/(?:comprobantes|documentos/deudas)/[A-Za-z0-9_-]+\\.(?:${EXTENSIONES})$`,
)

// Un comprobante pertenece al libro que dice su clave. Se comprueba antes de firmar el enlace
// de lectura: sin esto, quien conozca la clave de otro libro podría pedir su factura y el
// servidor la firmaría sin mirar.
export const esDelLibro = (clave: string, bookId: string): boolean =>
  FORMA_DE_CLAVE.exec(clave)?.groups?.libro === bookId

// Borrar pasa por la misma comprobación que leer. Las claves que se borran salen de la base, y
// si alguna vez una de otro libro terminara guardada donde no va, en R2 se borraría la factura
// de otra familia.
export const borrarDelLibro = async (
  archivos: Pick<Almacenamiento, 'borrar'>,
  clave: string,
  bookId: string,
): Promise<void> => {
  if (!esDelLibro(clave, bookId)) throw new Error('Esa clave no es de este libro: no se borra.')
  await archivos.borrar(clave)
}
