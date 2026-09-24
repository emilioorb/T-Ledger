import { AsyncLocalStorage } from 'node:async_hooks'
import { Injectable, type NestMiddleware } from '@nestjs/common'
import type { NextFunction, Request, Response } from 'express'

// Qué versión de la app hizo el pedido. La web la manda en cada uno; la app instalada que todavía
// no se actualizó, no. Sirve para medir cuántas escrituras llegan sin `version` y de qué clientes,
// antes de volverla obligatoria (6b).
export const CABECERA_DE_VERSION = 'x-version-cliente'

const SIN_CABECERA = 'sin cabecera'
// Solo lo que tiene forma de versión: la cabecera la escribe cualquiera, y va al log y a las
// métricas, donde un texto libre sería ruido o algo peor.
const FORMA_DE_VERSION = /^[0-9A-Za-z.+-]{1,32}$/

const almacen = new AsyncLocalStorage<string>()

export const leerVersionDelCliente = (cabecera: string | undefined): string => {
  if (cabecera === undefined) return SIN_CABECERA
  return FORMA_DE_VERSION.test(cabecera) ? cabecera : 'ilegible'
}

export const versionDelCliente = (): string => almacen.getStore() ?? 'fuera de un pedido'

// Middleware y no interceptor por lo mismo que el del libro: llama a `next()` adentro del contexto,
// y así el resto de la cadena lo ve.
@Injectable()
export class VersionDelClienteMiddleware implements NestMiddleware {
  use(peticion: Request, _respuesta: Response, seguir: NextFunction): void {
    almacen.run(leerVersionDelCliente(peticion.header(CABECERA_DE_VERSION)), seguir)
  }
}
