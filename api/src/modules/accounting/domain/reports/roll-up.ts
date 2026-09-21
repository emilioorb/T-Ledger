import type { CurrencyCode } from '../../../../shared/kernel/currency.js'
import { Money } from '../../../../shared/kernel/money.js'
import { unwrap } from '../../../../shared/kernel/result.js'
import { signedBalance } from '../account-balance.js'
import type { ChartOfAccounts } from '../chart-of-accounts.js'
import type { AccountMovementTotals } from '../journal-repository.port.js'

export interface ReportNode {
  readonly accountCode: string
  readonly accountName: string
  readonly balance: Money
  readonly level: number
  readonly children: ReportNode[]
}

// El saldo con signo de cada cuenta que tuvo movimiento, sin acumular todavía.
export const ownBalances = (
  totals: readonly AccountMovementTotals[],
  chart: ChartOfAccounts,
  currency: CurrencyCode,
): Map<string, Money> => {
  const balances = new Map<string, Money>()

  for (const total of totals) {
    const account = chart.byCode(total.accountCode)
    if (!account) continue
    balances.set(
      total.accountCode,
      signedBalance(
        Money.fromMinorUnits(total.debits, currency),
        Money.fromMinorUnits(total.credits, currency),
        account.accountClass,
      ),
    )
  }

  return balances
}

// Una cuenta agrupadora nunca tiene saldo propio: siempre es la suma de sus
// descendientes. Se recorre en profundidad, de las hojas hacia arriba.
export const rollUp = (
  chart: ChartOfAccounts,
  balances: ReadonlyMap<string, Money>,
  currency: CurrencyCode,
): Map<string, Money> => {
  const accumulated = new Map<string, Money>()

  const visit = (code: string): Money => {
    const children = chart.childrenOf(code)
    const own = balances.get(code) ?? Money.zero(currency)
    const total = children.reduce((acc, child) => unwrap(acc.add(visit(child.code))), own)
    accumulated.set(code, total)
    return total
  }

  for (const root of chart.roots()) visit(root.code)
  return accumulated
}

// Una rama sin un solo movimiento no se reporta: un estado de situación con el plan
// entero adentro esconde las cinco cuentas que sí importan detrás de veinte ceros.
export const buildTree = (
  chart: ChartOfAccounts,
  accumulated: ReadonlyMap<string, Money>,
  moved: ReadonlySet<string>,
  rootCode: string,
  currency: CurrencyCode,
): ReportNode | null => {
  const account = chart.byCode(rootCode)
  if (!account) return null

  const children = chart
    .childrenOf(rootCode)
    .map((child) => buildTree(chart, accumulated, moved, child.code, currency))
    .filter((child): child is ReportNode => child !== null)

  if (children.length === 0 && !moved.has(rootCode)) return null

  return {
    accountCode: account.code,
    accountName: account.name,
    balance: accumulated.get(rootCode) ?? Money.zero(currency),
    level: chart.levelOf(rootCode),
    children,
  }
}

export const asSection = (node: ReportNode | null): ReportNode[] => (node ? [node] : [])

export const indexTree = (nodes: readonly ReportNode[]): Map<string, ReportNode> => {
  const index = new Map<string, ReportNode>()

  const visit = (node: ReportNode): void => {
    index.set(node.accountCode, node)
    for (const child of node.children) visit(child)
  }

  for (const node of nodes) visit(node)
  return index
}
