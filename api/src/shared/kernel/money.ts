import { Decimal } from 'decimal.js'
import { MINOR_UNIT_EXPONENT, type CurrencyCode } from './currency.js'
import { err, ok, type Result } from './result.js'

export class CurrencyMismatchError extends Error {
  readonly code = 'CURRENCY_MISMATCH'

  constructor(
    readonly left: CurrencyCode,
    readonly right: CurrencyCode,
  ) {
    super(`No se pueden operar montos en ${left} y ${right}`)
    this.name = 'CurrencyMismatchError'
  }
}

const RATIO_SCALE = 1_000_000

export class Money {
  private constructor(
    readonly minorUnits: bigint,
    readonly currency: CurrencyCode,
  ) {}

  static fromMinorUnits(minorUnits: bigint, currency: CurrencyCode): Money {
    return new Money(minorUnits, currency)
  }

  static fromDecimal(value: Decimal.Value, currency: CurrencyCode): Money {
    const factor = new Decimal(10).pow(MINOR_UNIT_EXPONENT[currency])
    const minor = new Decimal(value).mul(factor).toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
    return new Money(BigInt(minor.toFixed(0)), currency)
  }

  static zero(currency: CurrencyCode): Money {
    return new Money(0n, currency)
  }

  add(other: Money): Result<Money, CurrencyMismatchError> {
    if (other.currency !== this.currency) {
      return err(new CurrencyMismatchError(this.currency, other.currency))
    }
    return ok(new Money(this.minorUnits + other.minorUnits, this.currency))
  }

  subtract(other: Money): Result<Money, CurrencyMismatchError> {
    if (other.currency !== this.currency) {
      return err(new CurrencyMismatchError(this.currency, other.currency))
    }
    return ok(new Money(this.minorUnits - other.minorUnits, this.currency))
  }

  multiply(factor: Decimal.Value): Money {
    const product = this.toDecimal().mul(factor)
    return Money.fromDecimal(product, this.currency)
  }

  // Reparte el monto entre las razones dadas distribuyendo el residuo unidad por unidad,
  // de modo que la suma de las partes siempre iguala el total.
  allocate(ratios: readonly number[]): Money[] {
    if (ratios.length === 0) {
      throw new RangeError('allocate requiere al menos una razón')
    }
    const scaled = ratios.map((ratio) => BigInt(Math.round(ratio * RATIO_SCALE)))
    const totalRatio = scaled.reduce((acc, value) => acc + value, 0n)
    if (totalRatio <= 0n) {
      throw new RangeError('La suma de las razones debe ser mayor que cero')
    }

    const negative = this.minorUnits < 0n
    const magnitude = negative ? -this.minorUnits : this.minorUnits
    const shares = scaled.map((ratio) => (magnitude * ratio) / totalRatio)

    let remainder = magnitude - shares.reduce((acc, value) => acc + value, 0n)
    for (let index = 0; remainder > 0n; index = (index + 1) % shares.length, remainder -= 1n) {
      shares[index] = (shares[index] ?? 0n) + 1n
    }

    return shares.map((share) => new Money(negative ? -share : share, this.currency))
  }

  compareTo(other: Money): Result<number, CurrencyMismatchError> {
    if (other.currency !== this.currency) {
      return err(new CurrencyMismatchError(this.currency, other.currency))
    }
    if (this.minorUnits > other.minorUnits) return ok(1)
    if (this.minorUnits < other.minorUnits) return ok(-1)
    return ok(0)
  }

  negate(): Money {
    return new Money(-this.minorUnits, this.currency)
  }

  isZero(): boolean {
    return this.minorUnits === 0n
  }

  isNegative(): boolean {
    return this.minorUnits < 0n
  }

  equals(other: Money): boolean {
    return this.minorUnits === other.minorUnits && this.currency === other.currency
  }

  toDecimal(): Decimal {
    return new Decimal(this.minorUnits.toString()).div(
      new Decimal(10).pow(MINOR_UNIT_EXPONENT[this.currency]),
    )
  }

  toJSON(): { minorUnits: string; currency: CurrencyCode } {
    return { minorUnits: this.minorUnits.toString(), currency: this.currency }
  }
}
