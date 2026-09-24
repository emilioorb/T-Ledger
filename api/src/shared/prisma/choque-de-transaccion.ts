// Los errores de la base llegan envueltos de formas distintas según dónde fallen, y Prisma no
// exporta clases para todas. Medido con `@prisma/adapter-pg`:
// - un choque en el COMMIT: `DriverAdapterError` con `cause.kind === 'TransactionWriteConflict'`
//   y el código en `cause.originalCode`;
// - una consulta cruda que falla: `P2010` con el error del adapter en `meta.driverAdapterError`;
// - lo que describe la documentación: `P2034`, o el código de Postgres en `sqlState`.
// Por eso se juntan los códigos de todas las capas y se decide sobre esa lista.
// https://www.prisma.io/docs/orm/v7/prisma-client/queries/transactions (Write conflicts)
const PROFUNDIDAD_MAXIMA = 6

const propiedad = (valor: unknown, nombre: string): unknown =>
  typeof valor === 'object' && valor !== null && nombre in valor
    ? (valor as Record<string, unknown>)[nombre]
    : undefined

const codigosDe = (error: unknown): Set<string> => {
  const codigos = new Set<string>()
  const pendientes: { valor: unknown; nivel: number }[] = [{ valor: error, nivel: 0 }]
  for (let siguiente = pendientes.pop(); siguiente; siguiente = pendientes.pop()) {
    const { valor, nivel } = siguiente
    if (!valor || nivel > PROFUNDIDAD_MAXIMA) continue
    for (const campo of ['code', 'sqlState', 'originalCode', 'kind']) {
      const codigo = propiedad(valor, campo)
      if (typeof codigo === 'string') codigos.add(codigo)
    }
    pendientes.push({ valor: propiedad(valor, 'cause'), nivel: nivel + 1 })
    pendientes.push({ valor: propiedad(propiedad(valor, 'meta'), 'driverAdapterError'), nivel: nivel + 1 })
  }
  return codigos
}

const tieneAlguno = (error: unknown, buscados: readonly string[]) => {
  const codigos = codigosDe(error)
  return buscados.some((codigo) => codigos.has(codigo))
}

// Postgres abortó la transacción por un cruce (40001) o un deadlock (40P01). Se puede reintentar.
export const esChoqueDeTransaccion = (error: unknown): boolean =>
  tieneAlguno(error, ['P2034', 'TransactionWriteConflict', '40001', '40P01'])

// La espera por el candado del libro pasó su tope (`lock_timeout`, 55P03), o la transacción
// entera se pasó de su tiempo (P2028). No es un error de la persona: hay una cola en su libro.
export const esEsperaVencida = (error: unknown): boolean => tieneAlguno(error, ['55P03', 'P2028'])

// Se agotaron los reintentos, o la cola del libro no avanzó. No es un error de la persona ni de sus
// datos, así que la respuesta pide probar de nuevo en vez de hablar de una edición pisada.
export class ChoqueDeTransaccionError extends Error {
  constructor(cause: unknown) {
    super('No se pudo guardar por un cruce momentáneo con otra escritura.', { cause })
    this.name = 'ChoqueDeTransaccionError'
  }
}
