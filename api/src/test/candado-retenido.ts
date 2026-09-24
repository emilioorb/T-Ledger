import type { PrismaService } from '../shared/prisma/prisma.service.js'

const TOPE_DE_ESPERA_MS = 3_000

// Hasta que `cuantos` pedidos estén esperando un candado en la base.
const esperarQueEsperen = async (prisma: PrismaService, cuantos: number): Promise<void> => {
  const hasta = Date.now() + TOPE_DE_ESPERA_MS
  while (Date.now() < hasta) {
    const [fila] = await prisma.clientSinFiltroDeLibro.$queryRaw<{ n: number }[]>`SELECT count(*)::int AS n FROM pg_locks l WHERE l.locktype = 'advisory' AND NOT l.granted`
    if ((fila?.n ?? 0) >= cuantos) return
    await new Promise((listo) => setTimeout(listo, 20))
  }
  throw new Error(`Nunca hubo ${cuantos} pedidos esperando el candado del libro`)
}

// Toma el candado del libro y no lo suelta hasta ver en la base a `cuantos` pedidos esperándolo.
// Con `Promise.all` a secas nada asegura que dos pedidos se solapen: pueden ir por turno, y el
// test pasa sin haber probado la carrera. `mientras` corre adentro, con el candado todavía
// tomado: es lo que «llega primero».
export const conElCandadoRetenido = async <T>(
  prisma: PrismaService,
  cuantos: number,
  pedidos: () => Promise<T>,
  mientras: () => Promise<unknown> = async () => undefined,
): Promise<T> => {
  let soltar: () => void = () => {}
  const retenido = new Promise<void>((listo) => (soltar = listo))
  let tomado: () => void = () => {}
  const yaTomo = new Promise<void>((listo) => (tomado = listo))

  const candado = prisma.withTransaction(async () => {
    tomado()
    await retenido
    await mientras()
  })
  await yaTomo
  const resultado = pedidos()
  // Si falla antes de que se lo espere, que no quede como rechazo sin atender.
  resultado.catch(() => undefined)
  try {
    await esperarQueEsperen(prisma, cuantos)
  } finally {
    soltar()
    await candado
  }
  return resultado
}
