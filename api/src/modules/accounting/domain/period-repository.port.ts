import type { AccountingPeriod, PeriodKey } from './accounting-period.js'

// Un mes sin fila en la base es un mes abierto. No hace falta crear doce filas por año
// para representar lo que es el estado por omisión.
export interface PeriodRepository {
  find(key: PeriodKey): Promise<AccountingPeriod | null>
  findAll(): Promise<AccountingPeriod[]>
  findClosedAfter(key: PeriodKey): Promise<AccountingPeriod[]>
  save(period: AccountingPeriod): Promise<void>
  saveMany(periods: readonly AccountingPeriod[]): Promise<void>
}

export const PERIOD_REPOSITORY = Symbol('PERIOD_REPOSITORY')
