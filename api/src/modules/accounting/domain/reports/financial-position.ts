import type { CurrencyCode } from '../../../../shared/kernel/currency.js'
import { Money } from '../../../../shared/kernel/money.js'
import { unwrap } from '../../../../shared/kernel/result.js'
import { rootCodeOf, type AccountClass } from '../account-class.js'
import type { ChartOfAccounts } from '../chart-of-accounts.js'
import type { AccountMovementTotals } from '../journal-repository.port.js'
import { periodResultOf } from './income-statement.js'
import {
  asSection,
  buildTree,
  indexTree,
  ownBalances,
  rollUp,
  type ReportNode,
} from './roll-up.js'

// No es una cuenta: es una línea derivada. El código no es numérico justamente para que
// no pueda colisionar con ninguna cuenta del plan, que siempre lo es.
export const PERIOD_RESULT_CODE = 'RESULTADO-DEL-PERIODO'

export interface FinancialPositionSections {
  readonly assets: ReportNode[]
  readonly liabilities: ReportNode[]
  readonly equity: ReportNode[]
}

export interface FinancialPosition {
  readonly assets: Money
  readonly liabilities: Money
  readonly equity: Money
  readonly periodResult: Money
  readonly balances: boolean
  readonly sections: FinancialPositionSections
  nodeFor(code: string): ReportNode | undefined
}

const totalFor = (
  accumulated: ReadonlyMap<string, Money>,
  code: string,
  currency: CurrencyCode,
): Money => accumulated.get(code) ?? Money.zero(currency)

const periodResultNode = (periodResult: Money): ReportNode => ({
  accountCode: PERIOD_RESULT_CODE,
  accountName: 'Resultado del período',
  balance: periodResult,
  level: 0,
  children: [],
})

// La identidad cuadra sin asientos de cierre porque el patrimonio incluye el resultado
// del período como línea derivada. Sin ella, un gasto pagado de caja dejaría el activo
// en negativo contra un patrimonio en cero.
export const buildFinancialPosition = (
  totals: readonly AccountMovementTotals[],
  chart: ChartOfAccounts,
  currency: CurrencyCode,
): FinancialPosition => {
  const own = ownBalances(totals, chart, currency)
  const accumulated = rollUp(chart, own, currency)
  const moved = new Set(own.keys())

  const section = (accountClass: AccountClass): ReportNode[] =>
    asSection(buildTree(chart, accumulated, moved, rootCodeOf(accountClass), currency))

  const periodResult = periodResultOf(accumulated, currency)
  const assets = totalFor(accumulated, rootCodeOf('ASSET'), currency)
  const liabilities = totalFor(accumulated, rootCodeOf('LIABILITY'), currency)
  const equity = unwrap(totalFor(accumulated, rootCodeOf('EQUITY'), currency).add(periodResult))

  const sections: FinancialPositionSections = {
    assets: section('ASSET'),
    liabilities: section('LIABILITY'),
    equity: [...section('EQUITY'), periodResultNode(periodResult)],
  }

  const index = indexTree(Object.values(sections).flat())

  return {
    assets,
    liabilities,
    equity,
    periodResult,
    balances: assets.minorUnits === liabilities.minorUnits + equity.minorUnits,
    sections,
    nodeFor: (code) => index.get(code),
  }
}
