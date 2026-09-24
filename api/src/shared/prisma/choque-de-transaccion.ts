// Cuando dos transacciones serializables se cruzan, Postgres aborta una (40001, falla de
// serialización; 40P01, deadlock). La documentación de Prisma lo describe como `P2034` o con el
// código en `sqlState`. Medido con `@prisma/adapter-pg`: cuando el choque aparece en el COMMIT
// llega como `DriverAdapterError` con `cause.kind === 'TransactionWriteConflict'` y el código en
// `originalCode`. Se aceptan las tres formas, en el error o en su cadena de `cause`: Prisma no
// exporta una clase para esto.
// https://www.prisma.io/docs/orm/v7/prisma-client/queries/transactions (Write conflicts)
const CODIGOS_DE_CHOQUE = new Set(['40001', '40P01'])
const PROFUNDIDAD_MAXIMA = 5

const propiedad = (valor: unknown, nombre: string): unknown =>
  typeof valor === 'object' && valor !== null && nombre in valor
    ? (valor as Record<string, unknown>)[nombre]
    : undefined

export const esChoqueDeTransaccion = (error: unknown): boolean => {
  let actual = error
  for (let nivel = 0; nivel < PROFUNDIDAD_MAXIMA && actual; nivel += 1) {
    if (propiedad(actual, 'code') === 'P2034') return true
    if (propiedad(actual, 'kind') === 'TransactionWriteConflict') return true
    for (const campo of ['sqlState', 'originalCode']) {
      const codigo = propiedad(actual, campo)
      if (typeof codigo === 'string' && CODIGOS_DE_CHOQUE.has(codigo)) return true
    }
    actual = propiedad(actual, 'cause')
  }
  return false
}

// Se agotaron los reintentos: el choque se repitió. No es un error de la persona ni de sus
// datos, así que la respuesta pide probar de nuevo en vez de hablar de una edición pisada.
export class ChoqueDeTransaccionError extends Error {
  constructor(cause: unknown) {
    super('No se pudo guardar por un cruce momentáneo con otra escritura.', { cause })
    this.name = 'ChoqueDeTransaccionError'
  }
}
