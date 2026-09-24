import { fromMoney } from '../../../shared/http/money.schema.js'
import type { Debt } from '../domain/debt.js'
import type { DebtResponse } from './debt.schemas.js'

const toIsoDate = (date: Date): string => date.toISOString().slice(0, 10)

export const toDebtResponse = (debt: Debt, at: Date): DebtResponse => {
  const schedule = debt.schedule()
  return {
    id: debt.id,
    name: debt.name,
    counterparty: debt.counterparty,
    principal: fromMoney(debt.principal),
    outstanding: fromMoney(debt.balanceAt(at)),
    annualRate: debt.rate.annualPercentage.toString(),
    compounding: debt.rate.compounding,
    termMonths: debt.termMonths,
    startDate: toIsoDate(debt.startDate),
    kind: debt.kind,
    direction: debt.direction,
    budgetBucket: debt.budgetBucket,
    notes: debt.notes,
    hasDocument: debt.documentKey !== null,
    version: debt.version,
    monthlyPayment: fromMoney(schedule.installments[0]?.payment ?? debt.principal.multiply(0)),
    totalInterest: fromMoney(schedule.totalInterest),
    payoffDate: toIsoDate(debt.payoffDate()),
  }
}
