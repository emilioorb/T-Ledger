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

export type RechazoDeArchivo = 'tipo' | 'tamano' | 'vacio'

export const revisar = (archivo: { mimetype: string; size: number }): RechazoDeArchivo | null => {
  if (archivo.size === 0) return 'vacio'
  if (archivo.size > TAMANO_MAXIMO) return 'tamano'
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
): string => `libros/${bookId}/comprobantes/${movementId}-${azar}.${TIPOS_ACEPTADOS[mimetype]}`

// Un comprobante pertenece al libro que dice su clave. Se comprueba antes de firmar el enlace
// de lectura: sin esto, quien conozca la clave de otro libro podría pedir su factura y el
// servidor la firmaría sin mirar.
export const esDelLibro = (clave: string, bookId: string): boolean =>
  clave.startsWith(`libros/${bookId}/`)
