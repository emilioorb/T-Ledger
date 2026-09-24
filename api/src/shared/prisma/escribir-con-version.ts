import { Logger } from '@nestjs/common'
import { EditadoPorOtroError, NotFoundError } from '../http/api-error.js'

// Control optimista (6b): una edición guarda solo si la fila sigue en la versión que se leyó.
// El candado del libro pone en fila a dos escrituras simultáneas; esto cubre lo otro, el
// formulario que alguien dejó abierto mientras otra persona ya guardó encima.

const registro = new Logger('Versiones')

// La condición para el `where` de un `updateMany` o `deleteMany`. Sin versión es un cliente
// viejo (la app instalada que todavía no se actualizó): escribe como antes, y queda anotado para
// medir cuántos quedan antes de volverla obligatoria. El log no lleva datos del libro.
export const condicionDeVersion = (version: number | undefined, que: string): { version?: number } => {
  if (version !== undefined) return { version }
  registro.log(`Escritura sin versión: ${que}`)
  return {}
}

// Toda escritura sobre una fila versionada la sube, también las laterales: si no, quien la
// leyó antes guardaría encima sin enterarse.
export const SUBIR_VERSION = { version: { increment: 1 } } as const

// Si la escritura condicionada no tocó nada, averigua por qué: si la fila sigue ahí, cambió
// mientras se editaba; si no, alguien la borró.
export const verificarEscritura = async (tocadas: number, existe: () => Promise<boolean>): Promise<void> => {
  if (tocadas > 0) return
  if (await existe()) throw new EditadoPorOtroError()
  throw new NotFoundError('Eso ya no existe: puede que lo hayan borrado recién.')
}
