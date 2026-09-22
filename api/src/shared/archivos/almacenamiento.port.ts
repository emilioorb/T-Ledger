export interface ArchivoNuevo {
  clave: string
  contenido: Buffer
  tipo: string
}

// Dónde viven los archivos que sube la gente. Hoy hay dos implementaciones: R2 cuando están
// las credenciales, y el disco cuando no. El dominio no sabe cuál es.
export interface Almacenamiento {
  guardar(archivo: ArchivoNuevo): Promise<void>

  // Un enlace que sirve por un rato y después deja de servir. Los comprobantes son facturas
  // con nombres, montos y a veces números de cuenta: el bucket es privado y cada lectura se
  // firma, en vez de repartir una URL eterna que funciona para cualquiera que la tenga.
  enlaceDeLectura(clave: string): Promise<string>

  borrar(clave: string): Promise<void>
}

export const ALMACENAMIENTO = Symbol('ALMACENAMIENTO')
