import { Logger } from '@nestjs/common'
import * as Sentry from '@sentry/node'
import { versionDelCliente } from '../observability/version-del-cliente.js'
import { EditadoPorOtroError, NotFoundError } from '../http/api-error.js'

// Control optimista (6b): una edición guarda solo si la fila sigue en la versión que se leyó.
// El candado del libro pone en fila a dos escrituras simultáneas; esto cubre lo otro, el
// formulario que alguien dejó abierto mientras otra persona ya guardó encima.

const registro = new Logger('Versiones')

// Una escritura sin `version`: la app sin actualizar, o un camino que todavía no la manda. Se
// cuenta en el log y en Sentry, con de qué cliente vino, para saber cuándo se puede volver
// obligatoria. Ni ids ni datos del libro: la operación y la versión, nada más.
const contarSinVersion = (que: string): void => {
  const cliente = versionDelCliente()
  registro.log(`Escritura sin versión: ${que} (cliente ${cliente})`)
  Sentry.metrics.count('escritura_sin_version', 1, { attributes: { operacion: que, cliente } })
}

// La condición para el `where` de un `updateMany` o `deleteMany`. Sin versión es un cliente
// viejo (la app instalada que todavía no se actualizó): escribe como antes, y queda anotado para
// medir cuántos quedan antes de volverla obligatoria. El log no lleva datos del libro.
export const condicionDeVersion = (version: number | undefined, que: string): { version?: number } => {
  if (version !== undefined) return { version }
  contarSinVersion(que)
  return {}
}

// Lo mismo cuando la fila ya se leyó dentro del candado del libro: comparar ahí no tiene carrera,
// y corta antes de que la regla escriba nada.
export const exigirVersion = (delCliente: number | undefined, leida: number, que: string): void => {
  if (delCliente === undefined) {
    contarSinVersion(que)
    return
  }
  if (delCliente !== leida) throw new EditadoPorOtroError()
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
