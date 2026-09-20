import type { Debt } from './debt.js'

export type PayoffStrategyId = 'avalanche' | 'snowball' | 'manual'

export interface PayoffStrategy {
  readonly id: PayoffStrategyId
  order(debts: readonly Debt[], at: Date): Debt[]
}

// Un préstamo otorgado no compite por el excedente, lo alimenta: queda fuera del orden.
// Una deuda ya saldada tampoco compite, pero se conserva al final para no perderla de vista.
const settledLast = (debts: readonly Debt[], at: Date) => {
  const active: Debt[] = []
  const settled: Debt[] = []
  for (const debt of debts) {
    if (debt.isLent()) continue
    if (debt.balanceAt(at).isZero()) settled.push(debt)
    else active.push(debt)
  }
  return { active, settled }
}

export class AvalancheStrategy implements PayoffStrategy {
  readonly id = 'avalanche' as const

  order(debts: readonly Debt[], at: Date): Debt[] {
    const { active, settled } = settledLast(debts, at)
    const sorted = [...active].sort((a, b) =>
      b.rate.monthlyRate().comparedTo(a.rate.monthlyRate()),
    )
    return [...sorted, ...settled]
  }
}

export class SnowballStrategy implements PayoffStrategy {
  readonly id = 'snowball' as const

  order(debts: readonly Debt[], at: Date): Debt[] {
    const { active, settled } = settledLast(debts, at)
    const sorted = [...active].sort((a, b) => {
      const left = a.balanceAt(at).minorUnits
      const right = b.balanceAt(at).minorUnits
      if (left === right) return 0
      return left < right ? -1 : 1
    })
    return [...sorted, ...settled]
  }
}

export class ManualOrderStrategy implements PayoffStrategy {
  readonly id = 'manual' as const

  constructor(private readonly orderedIds: readonly string[]) {}

  order(debts: readonly Debt[], at: Date): Debt[] {
    const { active, settled } = settledLast(debts, at)
    const rank = (debt: Debt) => {
      const index = this.orderedIds.indexOf(debt.id)
      return index === -1 ? Number.MAX_SAFE_INTEGER : index
    }
    const sorted = [...active].sort((a, b) => rank(a) - rank(b))
    return [...sorted, ...settled]
  }
}

export const payoffStrategyFor = (
  id: PayoffStrategyId,
  orderedIds: readonly string[] = [],
): PayoffStrategy => {
  switch (id) {
    case 'avalanche':
      return new AvalancheStrategy()
    case 'snowball':
      return new SnowballStrategy()
    case 'manual':
      return new ManualOrderStrategy(orderedIds)
  }
}
