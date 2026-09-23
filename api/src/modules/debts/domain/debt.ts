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

// El pago de una cuota. Sin movimiento cuando se pagó antes de llevar el libro: la cuota está
// saldada, pero no hay asiento que la respalde.
export interface DebtPayment {
  readonly installmentNumber: number
  readonly date: Date
  readonly movementId: string | null
}

export type InstallmentStatus = 'PAID' | 'OVERDUE' | 'PENDING'

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
  // Opcional al crear: una deuda nueva no tiene pagos. En orden y sin huecos: el pago n es el
  // de la cuota n.
  readonly payments?: readonly DebtPayment[]
  // Notas libres de quien lleva la deuda. No entran en ningún cálculo.
  readonly notes?: string | null
  // Dónde está guardado el contrato, si se adjuntó.
  readonly documentKey?: string | null
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
  get payments(): readonly DebtPayment[] { return this.props.payments ?? [] }
  get notes(): string | null { return this.props.notes ?? null }
  get documentKey(): string | null { return this.props.documentKey ?? null }

  withDocumentKey(documentKey: string | null): Debt {
    return new Debt({ ...this.props, documentKey })
  }

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

  // Lo que se debe baja con los pagos registrados, no con el calendario: una cuota vencida sin
  // pagar se sigue debiendo. Lo que te deben va por calendario, porque de eso no hay pagos.
  balanceAt(date: Date): Money {
    const installments = this.schedule().installments
    const saldadas = this.isLent()
      ? installments.filter((installment) => installment.dueDate.getTime() <= date.getTime()).length
      : this.payments.filter((payment) => payment.date.getTime() <= date.getTime()).length
    return installments[saldadas - 1]?.balance ?? this.props.principal
  }

  installmentStatuses(today: Date): InstallmentStatus[] {
    const pagadas = this.payments.length
    return this.schedule().installments.map((installment, index) => {
      if (index < pagadas) return 'PAID'
      return installment.dueDate.getTime() < today.getTime() ? 'OVERDUE' : 'PENDING'
    })
  }

  // Siempre la siguiente cuota: pagar la tercera con la segunda debiéndose dejaría un saldo que
  // no corresponde a ninguna fila de la tabla.
  registerPayment(payment: { date: Date; movementId: string | null }): Result<Debt, RangeError> {
    const siguiente = this.payments.length + 1
    if (siguiente > this.schedule().installments.length) {
      return err(new RangeError('La deuda ya no tiene cuotas por pagar'))
    }
    const ultimo = this.payments.at(-1)
    if (ultimo && payment.date.getTime() < ultimo.date.getTime()) {
      return err(new RangeError('Un pago no puede tener fecha anterior al último registrado'))
    }
    return ok(
      new Debt({
        ...this.props,
        payments: [...this.payments, { installmentNumber: siguiente, ...payment }],
      }),
    )
  }

  // Para una deuda que se carga ya empezada: lo vencido antes de cargarla se pagó sin que el
  // libro existiera, así que queda saldado sin movimiento. Solo tiene sentido sobre una deuda
  // sin pagos, que es como sale de `create`.
  settleDueBefore(date: Date): Debt {
    const vencidas = this.schedule().installments.filter(
      (installment) => installment.dueDate.getTime() <= date.getTime(),
    )
    return new Debt({
      ...this.props,
      payments: vencidas.map((installment) => ({
        installmentNumber: installment.number,
        date: installment.dueDate,
        movementId: null,
      })),
    })
  }

  undoLastPayment(): Result<{ debt: Debt; undone: DebtPayment }, RangeError> {
    const undone = this.payments.at(-1)
    if (!undone) return err(new RangeError('La deuda no tiene pagos para deshacer'))
    return ok({ debt: new Debt({ ...this.props, payments: this.payments.slice(0, -1) }), undone })
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
