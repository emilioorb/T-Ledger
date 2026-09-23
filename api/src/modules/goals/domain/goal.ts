import { Decimal } from 'decimal.js'
import { Money } from '../../../shared/kernel/money.js'
import { Percentage } from '../../../shared/kernel/percentage.js'
import { err, ok, unwrap, type Result } from '../../../shared/kernel/result.js'
import type { Contribution } from './contribution.js'

export interface GoalProps {
  readonly id: string
  readonly name: string
  readonly target: Money
  readonly desiredDate: Date
  readonly priority: number
  readonly accountCode: string | null
  readonly contributions: readonly Contribution[]
  // Una meta en pausa conserva lo aportado pero no pide plata: sale de la proyección y del
  // tablero hasta que se reactive. Opcional al crear: nace activa.
  readonly active?: boolean
}

const HUNDRED = 100

const monthsBetween = (from: Date, to: Date): number =>
  (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth())

const addMonths = (date: Date, months: number): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate()))

export class Goal {
  private constructor(private readonly props: GoalProps) {}

  static create(props: GoalProps): Result<Goal, RangeError> {
    if (props.name.trim().length === 0) {
      return err(new RangeError('La meta necesita un nombre'))
    }
    if (props.target.isZero() || props.target.isNegative()) {
      return err(new RangeError('El objetivo de una meta debe ser mayor que cero'))
    }
    if (Number.isNaN(props.desiredDate.getTime())) {
      return err(new RangeError('La meta recibió una fecha deseada inválida'))
    }

    const foreign = props.contributions.find(
      (contribution) => contribution.amount.currency !== props.target.currency,
    )
    if (foreign) {
      return err(
        new RangeError(
          `Un aporte en ${foreign.amount.currency} no cuenta para una meta en ${props.target.currency}`,
        ),
      )
    }

    return ok(new Goal({ ...props, name: props.name.trim() }))
  }

  get id(): string {
    return this.props.id
  }
  get name(): string {
    return this.props.name
  }
  get target(): Money {
    return this.props.target
  }
  get desiredDate(): Date {
    return this.props.desiredDate
  }
  get priority(): number {
    return this.props.priority
  }
  get accountCode(): string | null {
    return this.props.accountCode
  }
  get contributions(): readonly Contribution[] {
    return this.props.contributions
  }
  get active(): boolean {
    return this.props.active ?? true
  }

  withActive(active: boolean): Goal {
    return new Goal({ ...this.props, active })
  }

  contributed(): Money {
    return this.props.contributions.reduce(
      (acc, contribution) => unwrap(acc.add(contribution.amount)),
      Money.zero(this.props.target.currency),
    )
  }

  // Nunca negativo: aportar de más no genera un faltante al revés.
  remaining(): Money {
    const remaining = unwrap(this.props.target.subtract(this.contributed()))
    return remaining.isNegative() ? Money.zero(this.props.target.currency) : remaining
  }

  progress(): Percentage {
    const ratio = this.contributed().toDecimal().div(this.props.target.toDecimal()).mul(HUNDRED)
    return unwrap(Percentage.create(Decimal.min(ratio, HUNDRED)))
  }

  isReached(): boolean {
    return this.remaining().isZero()
  }

  // Lo que hay que poner por mes para llegar a la fecha deseada. Si la fecha ya pasó,
  // el saldo completo de una vez: no hay meses entre los que repartirlo.
  requiredMonthlyContribution(from: Date): Money {
    if (!this.active) return Money.zero(this.props.target.currency)
    const remaining = this.remaining()
    if (remaining.isZero()) return remaining

    const months = monthsBetween(from, this.props.desiredDate)
    if (months <= 0) return remaining

    return Money.fromDecimal(remaining.toDecimal().div(months), remaining.currency)
  }

  // El ritmo que Emilio lleva de verdad, no el que se propuso: total aportado sobre los
  // meses transcurridos desde el primer aporte.
  observedMonthlyPace(from: Date): Money | null {
    const [first] = [...this.props.contributions].sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    )
    if (!first) return null

    const months = Math.max(monthsBetween(first.date, from), 1)
    return Money.fromDecimal(this.contributed().toDecimal().div(months), this.props.target.currency)
  }

  // Sin aportes no hay fecha: proyectar desde cero exigiría inventar un ritmo, y una
  // fecha inventada es peor que decir que todavía no se sabe.
  projectedDate(from: Date): Date | null {
    if (this.isReached()) return from

    const pace = this.observedMonthlyPace(from)
    if (!pace || pace.isZero()) return null

    const months = this.remaining().toDecimal().div(pace.toDecimal()).ceil().toNumber()
    return addMonths(from, months)
  }

  addContribution(contribution: Contribution): Result<Goal, RangeError> {
    if (!this.active) return err(new RangeError('La meta está en pausa: reactivala para aportar'))
    return Goal.create({
      ...this.props,
      contributions: [...this.props.contributions, contribution],
    })
  }

  toProps(): GoalProps {
    return { ...this.props, contributions: [...this.props.contributions] }
  }
}
