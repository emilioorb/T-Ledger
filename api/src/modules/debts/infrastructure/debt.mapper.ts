import { Decimal } from 'decimal.js'
import { isCurrencyCode } from '../../../shared/kernel/currency.js'
import { InterestRate, type Compounding } from '../../../shared/kernel/interest-rate.js'
import { Money } from '../../../shared/kernel/money.js'
import { unwrap } from '../../../shared/kernel/result.js'
import type { DebtDirection, DebtPayment } from '../domain/debt.js'
import { Debt } from '../domain/debt.js'
import type { DebtKind } from '../domain/debt-kind.js'

export interface DebtRow {
  id: string
  name: string
  counterparty: string
  principalMinor: bigint
  currency: string
  annualRate: { toString(): string }
  compounding: Compounding
  termMonths: number
  startDate: Date
  kind: DebtKind
  direction: DebtDirection
  budgetBucket: string | null
  payments?: { installmentNumber: number; date: Date; movementId: string | null }[]
  notes: string | null
  documentKey: string | null
}

export const toDomain = (row: DebtRow): Debt => {
  if (!isCurrencyCode(row.currency)) {
    throw new RangeError(`Moneda desconocida en la base de datos: ${row.currency}`)
  }
  const rate = unwrap(InterestRate.create(new Decimal(row.annualRate.toString()), row.compounding))
  return unwrap(
    Debt.create({
      id: row.id,
      name: row.name,
      counterparty: row.counterparty,
      principal: Money.fromMinorUnits(row.principalMinor, row.currency),
      rate,
      termMonths: row.termMonths,
      startDate: row.startDate,
      kind: row.kind,
      direction: row.direction,
      budgetBucket: row.budgetBucket,
      notes: row.notes,
      documentKey: row.documentKey,
      payments: (row.payments ?? []).map(
        ({ installmentNumber, date, movementId }): DebtPayment => ({ installmentNumber, date, movementId }),
      ),
    }),
  )
}

export const toRow = (
  debt: Debt,
): Omit<DebtRow, 'annualRate' | 'payments'> & { annualRate: string } => ({
  id: debt.id,
  name: debt.name,
  counterparty: debt.counterparty,
  principalMinor: debt.principal.minorUnits,
  currency: debt.principal.currency,
  annualRate: debt.rate.annualPercentage.toFixed(6),
  compounding: debt.rate.compounding,
  termMonths: debt.termMonths,
  startDate: debt.startDate,
  kind: debt.kind,
  direction: debt.direction,
  budgetBucket: debt.budgetBucket,
  notes: debt.notes,
  documentKey: debt.documentKey,
})
