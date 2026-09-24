import { AsyncLocalStorage } from 'node:async_hooks'
import type { Prisma } from '../../generated/prisma/client.js'

// La transacción en curso y el libro cuyo candado tiene. Vive aparte para que la usen dos piezas
// sin depender una de la otra: el servicio que la abre y el filtro que exige que las escrituras
// de un libro pasen por ella (ADR-006).
export interface Transaccion {
  tx: Prisma.TransactionClient
  libro: string | undefined
  // Quién la abrió. El almacenamiento es uno para todo el proceso, y otra instancia del servicio
  // (en los tests, una con otro tope de espera) no debe tomar prestada una transacción ajena.
  abiertaPor: object
}

export const transacciones = new AsyncLocalStorage<Transaccion>()

export const transaccionActual = (): Transaccion | undefined => transacciones.getStore()
