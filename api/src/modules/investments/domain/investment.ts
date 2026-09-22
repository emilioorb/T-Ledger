import type { Decimal } from 'decimal.js'
import type { InterestRate } from '../../../shared/kernel/interest-rate.js'
import { Money } from '../../../shared/kernel/money.js'
import { err, ok, unwrap, type Result } from '../../../shared/kernel/result.js'

export type InvestmentKind = 'FIXED_TERM' | 'OPEN'

export interface InvestmentContribution {
  readonly id: string
  readonly date: Date
  readonly amount: Money
}

export interface InvestmentProps {
  readonly id: string
  readonly name: string
  readonly principal: Money
  readonly rate: InterestRate
  readonly openedAt: Date
  readonly kind: InvestmentKind
  readonly maturesAt: Date | null
  readonly accountCode: string | null
  readonly contributions: readonly InvestmentContribution[]
}

// Valor = P·(1+i)^n, con n en meses completos. Cada aporte capitaliza desde su
// propia fecha: multiplicar el acumulado por el factor completo sobrestimaría.
export const compoundedValue = (principal: Money, monthlyRate: Decimal, months: number): Money => {
  if (months <= 0) return principal
  return Money.fromDecimal(
    principal.toDecimal().mul(monthlyRate.plus(1).pow(months)),
    principal.currency,
  )
}

const monthsBetween = (from: Date, to: Date): number => {
  const months =
    (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth())
  // Meses completos: el día del mes decide si el último cuenta.
  return to.getUTCDate() >= from.getUTCDate() ? months : months - 1
}

export class Investment {
  private constructor(private readonly props: InvestmentProps) {}

  static create(props: InvestmentProps): Result<Investment, RangeError> {
    if (props.name.trim().length === 0) {
      return err(new RangeError('La inversión necesita un nombre'))
    }
    if (props.principal.isZero() || props.principal.isNegative()) {
      return err(new RangeError('El capital de una inversión debe ser mayor que cero'))
    }
    if (props.kind === 'FIXED_TERM' && props.maturesAt === null) {
      return err(new RangeError('Una inversión a plazo necesita fecha de vencimiento'))
    }
    if (props.maturesAt && props.maturesAt.getTime() < props.openedAt.getTime()) {
      return err(new RangeError('El vencimiento no puede ser anterior a la apertura'))
    }

    const foreign = props.contributions.find(
      (contribution) => contribution.amount.currency !== props.principal.currency,
    )
    if (foreign) {
      return err(
        new RangeError(
          `Un aporte en ${foreign.amount.currency} no entra en una inversión en ${props.principal.currency}`,
        ),
      )
    }

    return ok(new Investment({ ...props, name: props.name.trim() }))
  }

  get id(): string {
    return this.props.id
  }
  get name(): string {
    return this.props.name
  }
  get principal(): Money {
    return this.props.principal
  }
  get rate(): InterestRate {
    return this.props.rate
  }
  get openedAt(): Date {
    return this.props.openedAt
  }
  get kind(): InvestmentKind {
    return this.props.kind
  }
  get maturesAt(): Date | null {
    return this.props.maturesAt
  }
  get accountCode(): string | null {
    return this.props.accountCode
  }
  get contributions(): readonly InvestmentContribution[] {
    return this.props.contributions
  }

  // Después del vencimiento la plata está disponible, no rindiendo: la fecha se acota
  // al vencimiento antes de contar meses.
  valueAt(date: Date): Money {
    const until = this.cappedAt(date)
    const monthlyRate = this.props.rate.monthlyRate()

    const principal = compoundedValue(
      this.props.principal,
      monthlyRate,
      monthsBetween(this.props.openedAt, until),
    )

    // Solo los aportes ya hechos a esa fecha. Sumarlos todos hacía que la inversión valiera
    // más de lo invertido el día que se abrió, y la diferencia se mostraba como interés ganado.
    return this.contributionsUntil(until).reduce(
      (acc, contribution) =>
        unwrap(
          acc.add(
            compoundedValue(
              contribution.amount,
              monthlyRate,
              monthsBetween(contribution.date, until),
            ),
          ),
        ),
      principal,
    )
  }

  interestEarnedAt(date: Date): Money {
    return unwrap(this.valueAt(date).subtract(this.investedAt(date)))
  }

  // El capital puesto hasta esa fecha: lo aportado después no se cuenta como invertido.
  investedAt(date: Date): Money {
    return this.contributionsUntil(this.cappedAt(date)).reduce(
      (acc, contribution) => unwrap(acc.add(contribution.amount)),
      this.props.principal,
    )
  }

  private contributionsUntil(until: Date): readonly InvestmentContribution[] {
    return this.props.contributions.filter(
      (contribution) => contribution.date.getTime() <= until.getTime(),
    )
  }

  maturityPeriod(): { year: number; month: number } | null {
    if (!this.props.maturesAt) return null
    return {
      year: this.props.maturesAt.getUTCFullYear(),
      month: this.props.maturesAt.getUTCMonth() + 1,
    }
  }

  isMaturedAt(date: Date): boolean {
    return this.props.maturesAt !== null && date.getTime() >= this.props.maturesAt.getTime()
  }

  addContribution(contribution: InvestmentContribution): Result<Investment, RangeError> {
    return Investment.create({
      ...this.props,
      contributions: [...this.props.contributions, contribution],
    })
  }

  toProps(): InvestmentProps {
    return { ...this.props, contributions: [...this.props.contributions] }
  }

  private cappedAt(date: Date): Date {
    if (this.props.maturesAt && date.getTime() > this.props.maturesAt.getTime()) {
      return this.props.maturesAt
    }
    return date
  }
}
