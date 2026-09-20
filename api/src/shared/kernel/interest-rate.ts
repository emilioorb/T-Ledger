import { Decimal } from 'decimal.js'
import { err, ok, type Result } from './result.js'

export type Compounding = 'MONTHLY' | 'ANNUAL'

const MONTHS_PER_YEAR = 12

export class InterestRate {
  private constructor(
    readonly annualPercentage: Decimal,
    readonly compounding: Compounding,
  ) {}

  static create(annualPercentage: Decimal.Value, compounding: Compounding): Result<InterestRate, RangeError> {
    const decimal = new Decimal(annualPercentage)
    if (!decimal.isFinite() || decimal.lessThan(0)) {
      return err(new RangeError(`Una tasa no puede ser negativa, se recibió ${decimal.toString()}`))
    }
    return ok(new InterestRate(decimal, compounding))
  }

  static zero(): InterestRate {
    return new InterestRate(new Decimal(0), 'MONTHLY')
  }

  // MONTHLY: tasa nominal anual dividida en doce. ANNUAL: tasa efectiva anual, se desanualiza.
  monthlyRate(): Decimal {
    const annualFraction = this.annualPercentage.div(100)
    if (this.compounding === 'MONTHLY') {
      return annualFraction.div(MONTHS_PER_YEAR)
    }
    return annualFraction.plus(1).pow(new Decimal(1).div(MONTHS_PER_YEAR)).minus(1)
  }

  isZero(): boolean {
    return this.annualPercentage.isZero()
  }
}
