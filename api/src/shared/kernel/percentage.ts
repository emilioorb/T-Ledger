import { Decimal } from 'decimal.js'
import { err, ok, type Result } from './result.js'

export class Percentage {
  private constructor(readonly value: Decimal) {}

  static create(value: Decimal.Value): Result<Percentage, RangeError> {
    const decimal = new Decimal(value)
    if (!decimal.isFinite() || decimal.lessThan(0) || decimal.greaterThan(100)) {
      return err(new RangeError(`Un porcentaje debe estar entre 0 y 100, se recibió ${decimal.toString()}`))
    }
    return ok(new Percentage(decimal))
  }

  toFraction(): Decimal {
    return this.value.div(100)
  }

  toString(): string {
    return `${this.value.toString()}%`
  }
}
