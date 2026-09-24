import type { Money } from '../../../shared/kernel/money.js'
import type { PeriodKey } from '../../accounting/domain/accounting-period.js'

// El único estimado declarado que queda en la fase 1: el gasto sale de los asientos,
// el ingreso del mes lo declara Emilio porque todavía no ocurrió.
export interface MonthlyIncome {
  readonly period: PeriodKey
  readonly amount: Money
  // La versión de la fila (6b). Sin fila todavía, no hay.
  readonly version?: number
}
