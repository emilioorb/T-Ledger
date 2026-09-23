import { createHash, timingSafeEqual } from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'

// La cabecera que Vercel agrega a todo lo que reenvía a esta API (web/vercel.json). Con ella se
// distingue el tráfico que pasó por Vercel del que llega directo al dominio de Railway.
export const CABECERA_DEL_PROXY = 'x-tledger-proxy'

// Railway pide esta ruta directo, sin pasar por Vercel, para saber si el servicio está vivo. Es
// el contrato de la API, que ya es público: el repositorio lo es.
const SIN_PROXY = new Set(['/api/v1/openapi.json'])

// Se comparan los resúmenes y no los textos: `timingSafeEqual` exige el mismo largo, y comparar
// el texto crudo delataría el largo del secreto por el tiempo que tarda en rechazar.
const resumen = (texto: string) => createHash('sha256').update(texto).digest()

interface Peticion {
  ruta: string
  cabecera: string | undefined
  secreto: string | undefined
}

// Sin secreto configurado no hay nada que exigir: en local no hay Vercel adelante.
export const pasaPorElProxy = ({ ruta, cabecera, secreto }: Peticion): boolean => {
  if (!secreto) return true
  if (SIN_PROXY.has(ruta)) return true
  if (cabecera === undefined) return false
  return timingSafeEqual(resumen(cabecera), resumen(secreto))
}

// Quien llegue directo a Railway podría inventarse la IP del cliente y saltarse el límite de
// intentos de entrar, que la toma de `x-vercel-forwarded-for`. Rechazar todo lo que no pasó
// por Vercel cierra esa puerta: la única forma de hablar con la API es a través del proxy.
export const soloPorElProxy =
  (secreto: string | undefined) => (peticion: Request, respuesta: Response, seguir: NextFunction) => {
    const cabecera = peticion.header(CABECERA_DEL_PROXY)
    if (pasaPorElProxy({ ruta: peticion.path, cabecera, secreto })) return seguir()
    respuesta.status(403).json({
      error: { code: 'FORBIDDEN', message: 'Esta API se usa a través de la aplicación.' },
    })
  }
