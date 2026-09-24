import type { PeriodKey } from '../../accounting/domain/accounting-period.js'
import type { CurrencyCode } from '../../../shared/kernel/currency.js'
import type { MonthlyIncome } from './budget-income.js'

export interface BudgetIncomeRepository {
  find(period: PeriodKey): Promise<MonthlyIncome | null>

  // El último ingreso declarado hasta un mes. La proyección lo arrastra a los meses que
  // todavía no se declararon: pintarlos en rojo por falta del dato haría que la pantalla
  // avise de un problema que no existe.
  // El último declarado en esa moneda: la proyección mira una moneda por vez, y un mes
  // declarado en otra no borra el ingreso que se venía arrastrando en esta.
  findLatestUpTo(period: PeriodKey, currency: CurrencyCode): Promise<MonthlyIncome | null>
  save(income: MonthlyIncome): Promise<void>
}

export const BUDGET_INCOME_REPOSITORY = Symbol('BUDGET_INCOME_REPOSITORY')
