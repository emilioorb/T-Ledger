import { Decimal } from 'decimal.js'
import type { InterestRate } from '../../../shared/kernel/interest-rate.js'
import { Money } from '../../../shared/kernel/money.js'
import { unwrap } from '../../../shared/kernel/result.js'
import { addMonths } from './add-months.js'
import type { DebtKind } from './debt-kind.js'

export interface Installment {
  readonly number: number
  readonly dueDate: Date
  readonly payment: Money
  readonly principal: Money
  readonly interest: Money
  readonly balance: Money
}

export interface ScheduleParams {
  readonly principal: Money
  readonly rate: InterestRate
  readonly termMonths: number
  readonly startDate: Date
  readonly kind: DebtKind
}

export class AmortizationSchedule {
  constructor(
    readonly installments: readonly Installment[],
    private readonly currency: Money,
  ) {}

  get totalInterest(): Money {
    return this.installments.reduce(
      (acc, installment) => unwrap(acc.add(installment.interest)),
      Money.zero(this.currency.currency),
    )
  }

  get totalPaid(): Money {
    return this.installments.reduce(
      (acc, installment) => unwrap(acc.add(installment.payment)),
      Money.zero(this.currency.currency),
    )
  }

  get finalBalance(): Money {
    return this.installments.at(-1)?.balance ?? Money.zero(this.currency.currency)
  }

  installmentNumber(n: number): Installment | undefined {
    return this.installments.find((installment) => installment.number === n)
  }

  installmentDueIn(year: number, month: number): Installment | undefined {
    return this.installments.find(
      (installment) =>
        installment.dueDate.getUTCFullYear() === year && installment.dueDate.getUTCMonth() + 1 === month,
    )
  }
}

// Cuota del sistema francés: P·i / (1 − (1+i)^−n). Con i = 0 el denominador se anula,
// así que ese caso se reparte linealmente.
const frenchPayment = (principal: Money, monthlyRate: Decimal, termMonths: number): Money => {
  const factor = monthlyRate.plus(1).pow(-termMonths)
  const value = principal.toDecimal().mul(monthlyRate).div(new Decimal(1).minus(factor))
  return Money.fromDecimal(value, principal.currency)
}

const principalShares = (principal: Money, termMonths: number): Money[] =>
  principal.allocate(Array.from({ length: termMonths }, () => 1))

export const buildSchedule = (params: ScheduleParams): AmortizationSchedule => {
  const { principal, rate, termMonths, startDate, kind } = params
  if (!Number.isInteger(termMonths) || termMonths <= 0) {
    throw new RangeError(`El plazo debe ser un entero positivo, se recibió ${termMonths}`)
  }

  const monthlyRate = kind === 'INTEREST_FREE' ? new Decimal(0) : rate.monthlyRate()
  const usesFixedPayment = kind === 'FRENCH' && !monthlyRate.isZero()
  const fixedPayment = usesFixedPayment ? frenchPayment(principal, monthlyRate, termMonths) : undefined
  const shares = usesFixedPayment ? undefined : principalShares(principal, termMonths)

  const installments: Installment[] = []
  let balance = principal

  for (let number = 1; number <= termMonths; number += 1) {
    const isLast = number === termMonths
    const interest = balance.multiply(monthlyRate)

    // La última cuota amortiza todo el saldo restante: ahí se absorbe el residuo de redondeo
    // y el saldo final queda en cero exacto, no en «casi cero».
    const principalPortion = isLast
      ? balance
      : (fixedPayment
          ? unwrap(fixedPayment.subtract(interest))
          : (shares?.[number - 1] ?? Money.zero(principal.currency)))

    const payment = unwrap(principalPortion.add(interest))
    balance = unwrap(balance.subtract(principalPortion))

    installments.push({
      number,
      dueDate: addMonths(startDate, number),
      payment,
      principal: principalPortion,
      interest,
      balance,
    })
  }

  return new AmortizationSchedule(installments, principal)
}
