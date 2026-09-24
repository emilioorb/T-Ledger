import { fromMoney } from '../../../shared/http/money.schema.js'
import type { Investment } from '../domain/investment.js'

const isoDate = (date: Date): string => date.toISOString().slice(0, 10)

export const toInvestmentResponse = (investment: Investment, at: Date) => ({
  id: investment.id,
  name: investment.name,
  principal: fromMoney(investment.principal),
  annualRate: investment.rate.annualPercentage.toString(),
  compounding: investment.rate.compounding,
  openedAt: isoDate(investment.openedAt),
  kind: investment.kind,
  maturesAt: investment.maturesAt ? isoDate(investment.maturesAt) : null,
  accountCode: investment.accountCode,
  version: investment.version,
  invested: fromMoney(investment.investedAt(at)),
  value: fromMoney(investment.valueAt(at)),
  interestEarned: fromMoney(investment.interestEarnedAt(at)),
  matured: investment.isMaturedAt(at),
  contributions: investment.contributions.map((contribution) => ({
    id: contribution.id,
    date: isoDate(contribution.date),
    amount: fromMoney(contribution.amount),
  })),
})
