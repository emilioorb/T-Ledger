import type { CurrencyCode } from '../../../../shared/kernel/currency.js'
import { Money } from '../../../../shared/kernel/money.js'
import { unwrap } from '../../../../shared/kernel/result.js'
import { rootCodeOf, type AccountClass } from '../account-class.js'
import type { ChartOfAccounts } from '../chart-of-accounts.js'
import type { AccountMovementTotals } from '../journal-repository.port.js'
import { asSection, buildTree, indexTree, ownBalances, rollUp, type ReportNode } from './roll-up.js'

export interface IncomeStatementSections {
  readonly income: ReportNode[]
  readonly costOfRevenue: ReportNode[]
  readonly operatingExpenses: ReportNode[]
}

export interface IncomeStatement {
  readonly income: Money
  readonly costOfRevenue: Money
  readonly operatingExpenses: Money
  readonly result: Money
  readonly sections: IncomeStatementSections
  nodeFor(code: string): ReportNode | undefined
}

const totalFor = (
  accumulated: ReadonlyMap<string, Money>,
  code: string,
  currency: CurrencyCode,
): Money => accumulated.get(code) ?? Money.zero(currency)

// El resultado del período, con el único criterio que existe en el módulo: lo usan el
// estado de resultados y la línea derivada de patrimonio del estado de situación.
export const periodResultOf = (
  accumulated: ReadonlyMap<string, Money>,
  currency: CurrencyCode,
): Money => {
  const income = totalFor(accumulated, rootCodeOf('INCOME'), currency)
  const costOfRevenue = totalFor(accumulated, rootCodeOf('COST_OF_REVENUE'), currency)
  const operatingExpenses = totalFor(accumulated, rootCodeOf('OPERATING_EXPENSE'), currency)

  return unwrap(unwrap(income.subtract(costOfRevenue)).subtract(operatingExpenses))
}

export const buildIncomeStatement = (
  totals: readonly AccountMovementTotals[],
  chart: ChartOfAccounts,
  currency: CurrencyCode,
): IncomeStatement => {
  const own = ownBalances(totals, chart, currency)
  const accumulated = rollUp(chart, own, currency)
  const moved = new Set(own.keys())

  const section = (accountClass: AccountClass): ReportNode[] =>
    asSection(buildTree(chart, accumulated, moved, rootCodeOf(accountClass), currency))

  const sections: IncomeStatementSections = {
    income: section('INCOME'),
    costOfRevenue: section('COST_OF_REVENUE'),
    operatingExpenses: section('OPERATING_EXPENSE'),
  }

  const index = indexTree(Object.values(sections).flat())

  return {
    income: totalFor(accumulated, rootCodeOf('INCOME'), currency),
    costOfRevenue: totalFor(accumulated, rootCodeOf('COST_OF_REVENUE'), currency),
    operatingExpenses: totalFor(accumulated, rootCodeOf('OPERATING_EXPENSE'), currency),
    result: periodResultOf(accumulated, currency),
    sections,
    nodeFor: (code) => index.get(code),
  }
}
