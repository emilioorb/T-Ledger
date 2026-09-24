import type { UnitOfWork } from '../shared/prisma/unit-of-work.port.js'

// Un repositorio cuyos métodos corren cada uno en su transacción, como los llamaría un caso de
// uso. Las escrituras de un libro no corren sueltas (ADR-006): los tests de repositorio las
// hacen pasar por acá en vez de saltarse el candado.
export const enTransaccion = <T extends object>(transaccion: UnitOfWork, repositorio: T): T =>
  new Proxy(repositorio, {
    get(objetivo, nombre, receptor) {
      const valor: unknown = Reflect.get(objetivo, nombre, receptor)
      if (typeof valor !== 'function') return valor
      return (...argumentos: unknown[]) =>
        transaccion.withTransaction(async () => (valor as (...a: unknown[]) => unknown).apply(objetivo, argumentos))
    },
  })
