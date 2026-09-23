import type { Debt, DebtDirection } from './debt.js'

export interface DebtPage {
  readonly items: Debt[]
  readonly totalItems: number
}

export interface DebtRepository {
  // `direction` filtra entre lo que se debe y lo que se prestó; sin él, devuelve ambos.
  findAll(page: number, pageSize: number, direction?: DebtDirection): Promise<DebtPage>
  findById(id: string): Promise<Debt | null>
  // La deuda cuya cuota pagó ese movimiento, si alguna.
  findByPaymentMovement(movementId: string): Promise<Debt | null>
  save(debt: Debt): Promise<void>
  delete(id: string): Promise<boolean>
}

// Token de inyección. Una interfaz de TypeScript se borra en tiempo de ejecución,
// así que el contenedor de Nest necesita un símbolo para resolver la implementación.
export const DEBT_REPOSITORY = Symbol('DEBT_REPOSITORY')
