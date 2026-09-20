import { Decimal } from 'decimal.js'
import type { CurrencyCode } from '../../../shared/kernel/currency.js'
import { Money } from '../../../shared/kernel/money.js'
import { unwrap } from '../../../shared/kernel/result.js'
import { addMonths } from './add-months.js'
import { AmortizationSchedule, buildSchedule, type Installment, type ScheduleParams } from './amortization.js'

export type ExtraPaymentMode = 'REDUCE_TERM' | 'REDUCE_PAYMENT'

export interface ExtraPayment {
  readonly amount: Money
  readonly afterInstallment: number
  readonly mode: ExtraPaymentMode
}

export interface DebtProjection {
  readonly baseline: AmortizationSchedule
  readonly withExtraPayment: AmortizationSchedule
  readonly extraPayment: Money
  readonly interestSaved: Money
  readonly monthsSaved: number
  readonly totalPaidWithExtra: Money
}

export const buildScheduleWithExtraPayment = (
  params: ScheduleParams,
  extra: ExtraPayment,
): AmortizationSchedule => {
  if (extra.amount.isZero() || extra.amount.isNegative()) {
    throw new RangeError('El abono extraordinario debe ser mayor que cero')
  }
  if (!Number.isInteger(extra.afterInstallment) || extra.afterInstallment < 1) {
    throw new RangeError('El abono debe aplicarse después de una cuota válida')
  }

  const baseline = buildSchedule(params)
  if (extra.afterInstallment >= baseline.installments.length) {
    throw new RangeError('El abono no puede aplicarse después de la última cuota')
  }

  const kept = baseline.installments.slice(0, extra.afterInstallment)
  const balanceAfterKept = kept.at(-1)?.balance ?? params.principal
  const remainingBalance = unwrap(balanceAfterKept.subtract(extra.amount))

  if (!remainingBalance.isNegative() && !remainingBalance.isZero()) {
    const monthlyRate = params.kind === 'INTEREST_FREE' ? new Decimal(0) : params.rate.monthlyRate()
    const remainingTerm = baseline.installments.length - kept.length
    const continuation =
      extra.mode === 'REDUCE_TERM'
        ? continueWithFixedPayment(remainingBalance, monthlyRate, keptPayment(baseline, kept))
        : buildSchedule({
            ...params,
            principal: remainingBalance,
            termMonths: remainingTerm,
          }).installments

    return new AmortizationSchedule(
      [...kept, ...renumber(continuation, kept.length, params.startDate)],
      params.principal,
    )
  }

  // El abono cubre todo el saldo: la deuda queda cerrada en la cuota en que se aplica,
  // así que esa cuota deja de arrastrar saldo y el plan termina ahí.
  return new AmortizationSchedule(closedAt(kept, params.principal.currency), params.principal)
}

const closedAt = (kept: readonly Installment[], currency: CurrencyCode): Installment[] => {
  const last = kept.at(-1)
  if (!last) return [...kept]
  return [...kept.slice(0, -1), { ...last, balance: Money.zero(currency) }]
}

const keptPayment = (baseline: AmortizationSchedule, kept: readonly Installment[]): Money =>
  baseline.installments[kept.length]?.payment ?? kept.at(-1)?.payment ?? Money.zero(baseline.totalPaid.currency)

// Mantiene la cuota original y consume el saldo hasta agotarlo; la última absorbe el residuo.
const continueWithFixedPayment = (
  startingBalance: Money,
  monthlyRate: Decimal,
  payment: Money,
): Installment[] => {
  const installments: Installment[] = []
  let balance = startingBalance
  let guard = 0

  while (!balance.isZero() && !balance.isNegative()) {
    guard += 1
    if (guard > 1200) throw new RangeError('La cuota no alcanza a cubrir el interés: la deuda no se amortiza')

    const interest = balance.multiply(monthlyRate)
    const available = unwrap(payment.subtract(interest))
    if (!available.isNegative() && !available.isZero() && unwrap(available.compareTo(balance)) >= 0) {
      installments.push(draft(balance, interest, unwrap(balance.add(interest)), Money.zero(balance.currency)))
      balance = Money.zero(balance.currency)
      continue
    }
    if (available.isZero() || available.isNegative()) {
      throw new RangeError('La cuota no alcanza a cubrir el interés: la deuda no se amortiza')
    }
    balance = unwrap(balance.subtract(available))
    installments.push(draft(available, interest, payment, balance))
  }

  return installments
}

const draft = (principal: Money, interest: Money, payment: Money, balance: Money): Installment => ({
  number: 0,
  dueDate: new Date(0),
  payment,
  principal,
  interest,
  balance,
})

const renumber = (
  installments: readonly Installment[],
  offset: number,
  startDate: Date,
): Installment[] =>
  installments.map((installment, index) => ({
    ...installment,
    number: offset + index + 1,
    dueDate: addMonths(startDate, offset + index + 1),
  }))
