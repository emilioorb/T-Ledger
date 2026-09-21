// Lo que la capa de aplicación necesita saber de una transacción: que todo lo de adentro
// se guarda junto o no se guarda nada. Nada de Prisma cruza esta puerta.
export interface UnitOfWork {
  withTransaction<T>(run: () => Promise<T>): Promise<T>
}

export const UNIT_OF_WORK = Symbol('UNIT_OF_WORK')
