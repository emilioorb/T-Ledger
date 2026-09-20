import type { InterestRate } from '../../../shared/kernel/interest-rate.js'
import { Money } from '../../../shared/kernel/money.js'
import { err, ok, unwrap, type Result } from '../../../shared/kernel/result.js'
import { buildSchedule, type AmortizationSchedule, type ScheduleParams } from './amortization.js'
import type { DebtKind } from './debt-kind.js'
import {
  buildScheduleWithExtraPayment,
  type DebtProjection,
  type ExtraPayment,
} from './extra-payment.js'

export type DebtDirection = 'BORROWED' | 'LENT'

export interface DebtProps {
  readonly id: string
  readonly name: string
  readonly counterparty: string
  readonly principal: Money
  readonly rate: InterestRate
  readonly termMonths: number
  readonly startDate: Date
  readonly kind: DebtKind
  readonly direction: DebtDirection
  readonly budgetBucket: string | null
}

export class Debt {
  private constructor(private readonly props: DebtProps) {}

  static create(props: DebtProps): Result<Debt, RangeError> {
    if (props.principal.isZero() || props.principal.isNegative()) {
      return err(new RangeError('El capital de una deuda debe ser mayor que cero'))
    }
    if (!Number.isInteger(props.termMonths) || props.termMonths <= 0) {
      return err(new RangeError('El plazo debe ser un entero positivo de meses'))
    }
    if (props.name.trim().length === 0) {
      return err(new RangeError('La deuda necesita un nombre'))
    }
    if (props.counterparty.trim().length === 0) {
      return err(new RangeError('La deuda necesita una contraparte'))
    }
    // Lo que se debe consume una cubeta del presupuesto; lo que se presta no consume ninguna.
    if (props.direction === 'BORROWED' && (props.budgetBucket?.trim() ?? '').length === 0) {
      return err(new RangeError('Una deuda propia necesita una cubeta de presupuesto'))
    }
    if (props.direction === 'LENT' && props.budgetBucket !== null) {
      return err(new RangeError('Un préstamo otorgado no pertenece a ninguna cubeta de presupuesto'))
    }
    return ok(
      new Debt({ ...props, name: props.name.trim(), counterparty: props.counterparty.trim() }),
    )
  }

  get id(): string { return this.props.id }
  get name(): string { return this.props.name }
  get counterparty(): string { return this.props.counterparty }
  get principal(): Money { return this.props.principal }
  get rate(): InterestRate { return this.props.rate }
  get termMonths(): number { return this.props.termMonths }
  get startDate(): Date { return this.props.startDate }
  get kind(): DebtKind { return this.props.kind }
  get direction(): DebtDirection { return this.props.direction }
  get budgetBucket(): string | null { return this.props.budgetBucket }

  isBorrowed(): boolean { return this.props.direction === 'BORROWED' }

  isLent(): boolean { return this.props.direction === 'LENT' }

  schedule(): AmortizationSchedule {
    return buildSchedule(this.scheduleParams())
  }

  payoffDate(): Date {
    const last = this.schedule().installments.at(-1)
    if (!last) throw new RangeError('Una deuda válida siempre tiene al menos una cuota')
    return last.dueDate
  }

  balanceAt(date: Date): Money {
    const installments = this.schedule().installments
    const due = installments.filter((installment) => installment.dueDate.getTime() <= date.getTime())
    return due.at(-1)?.balance ?? this.props.principal
  }

  installmentDueIn(year: number, month: number): Money {
    return this.schedule().installmentDueIn(year, month)?.payment ?? Money.zero(this.props.principal.currency)
  }

  applyExtraPayment(extra: ExtraPayment): Result<DebtProjection, RangeError> {
    try {
      const baseline = this.schedule()
      const withExtraPayment = buildScheduleWithExtraPayment(this.scheduleParams(), extra)
      return ok({
        baseline,
        withExtraPayment,
        extraPayment: extra.amount,
        interestSaved: unwrap(baseline.totalInterest.subtract(withExtraPayment.totalInterest)),
        monthsSaved: baseline.installments.length - withExtraPayment.installments.length,
        totalPaidWithExtra: unwrap(withExtraPayment.totalPaid.add(extra.amount)),
      })
    } catch (cause) {
      return err(cause instanceof RangeError ? cause : new RangeError('No se pudo simular el abono'))
    }
  }

  toProps(): DebtProps {
    return { ...this.props }
  }

  private scheduleParams(): ScheduleParams {
    return {
      principal: this.props.principal,
      rate: this.props.rate,
      termMonths: this.props.termMonths,
      startDate: this.props.startDate,
      kind: this.props.kind,
    }
  }
}
