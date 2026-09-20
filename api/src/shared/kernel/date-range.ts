import { err, ok, type Result } from './result.js'

const MS_PER_DAY = 86_400_000

const atUtcMidnight = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))

export class DateRange {
  private constructor(
    readonly from: Date,
    readonly to: Date,
  ) {}

  static create(from: Date, to: Date): Result<DateRange, RangeError> {
    const start = atUtcMidnight(from)
    const end = atUtcMidnight(to)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return err(new RangeError('El rango recibió una fecha inválida'))
    }
    if (start.getTime() > end.getTime()) {
      return err(new RangeError('La fecha inicial no puede ser posterior a la final'))
    }
    return ok(new DateRange(start, end))
  }

  contains(date: Date): boolean {
    const time = atUtcMidnight(date).getTime()
    return time >= this.from.getTime() && time <= this.to.getTime()
  }

  days(): number {
    return (this.to.getTime() - this.from.getTime()) / MS_PER_DAY + 1
  }
}
